export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const HOST = "webservices.amazon.co.jp";
const REGION = "us-west-2";
const SERVICE = "ProductAdvertisingAPI";
const TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
const PATH = "/";
const RESOURCES = [
  "Images.Primary.Medium",
  "ItemInfo.Title",
  "Offers.Listings.Price",
  "CustomerReviews.Count",
  "CustomerReviews.StarRating",
];

function hmac(key: crypto.BinaryLike | crypto.KeyObject, data: string) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256Hex(data: string) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function amzDates() {
  const iso = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function signingKey(secretKey: string, dateStamp: string) {
  const kDate = hmac("AWS4" + secretKey, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

type Product = {
  asin: string;
  title: string;
  url: string;
  imageUrl?: string;
  price?: string;
  amount?: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  matchedKeywords: string[];
};

export async function POST(req: NextRequest) {
  const accessKeyId = process.env.AMAZON_ACCESS_KEY_ID?.trim();
  const secretKey = process.env.AMAZON_SECRET_ACCESS_KEY?.trim();
  const partnerTag = process.env.AMAZON_PARTNER_TAG?.trim();

  if (!accessKeyId || !secretKey || !partnerTag) {
    return NextResponse.json(
      { products: [], error: "Amazon APIの資格情報が不足しています。" },
      { status: 400 }
    );
  }

  let payload: { keywords?: string[] } = {};
  try {
    payload = await req.json();
  } catch {}
  const keywords = (payload.keywords ?? [])
    .filter((k): k is string => typeof k === "string")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!keywords.length) return NextResponse.json({ products: [] });

  const all: Product[] = [];

  for (const kw of keywords) {
    const { amzDate, dateStamp } = amzDates();

    const bodyObj = {
      Keywords: kw,
      PartnerTag: partnerTag,
      PartnerType: "Associates",
      SearchIndex: "All",
      ItemCount: 6,
      Resources: RESOURCES,
    } as const;

    const body = JSON.stringify(bodyObj);
    const contentType = "application/json; charset=utf-8";
    const contentEncoding = "amz-1.0";
    const payloadHash = sha256Hex(body);

    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${HOST}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n` +
      `x-amz-target:${TARGET}\n`;
    const signedHeaders =
      "content-type;host;x-amz-content-sha256;x-amz-date;x-amz-target";

    const canonicalRequest = [
      "POST",
      PATH,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join("\n");

    const signature = crypto
      .createHmac("sha256", signingKey(secretKey, dateStamp))
      .update(stringToSign)
      .digest("hex");

    const authorization =
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      "content-type": contentType,
      "content-encoding": contentEncoding,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "x-amz-target": TARGET,
      Authorization: authorization,
    };

    try {
      const res = await fetch(`https://${HOST}${PATH}`, {
        method: "POST",
        headers,
        body,
        cache: "no-store",
      });

      const text = await res.text();
      if (!res.ok) {
        console.error("Amazon API error:", res.status, text);
        return NextResponse.json(
          { products: [], error: `Amazon API error ${res.status}`, details: text },
          { status: 502 }
        );
      }

      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {}

      const items: any[] =
        data?.SearchResult?.Items ??
        data?.ItemsResult?.Items ??
        [];

      for (const it of items) {
        if (!it?.ASIN || !it?.DetailPageURL) continue;
        const listing = it?.Offers?.Listings?.[0];

        all.push({
          asin: it.ASIN,
          title: it?.ItemInfo?.Title?.DisplayValue ?? "",
          url: it.DetailPageURL,
          imageUrl: it?.Images?.Primary?.Medium?.URL,
          price: listing?.Price?.DisplayAmount,
          amount: listing?.Price?.Amount,
          currency: listing?.Price?.Currency,
          rating: it?.CustomerReviews?.StarRating,
          reviewCount: it?.CustomerReviews?.Count,
          matchedKeywords: [kw],
        });
      }
    } catch (e: any) {
      console.error("PA-API request failed:", e?.message || String(e));
      return NextResponse.json(
        { products: [], error: "Amazon API request failed", details: e?.message || String(e) },
        { status: 502 }
      );
    }
  }

  const map = new Map<string, Product>();
  for (const p of all) {
    const ex = map.get(p.asin);
    if (!ex) map.set(p.asin, p);
    else
      map.set(p.asin, {
        ...ex,
        matchedKeywords: Array.from(new Set([...(ex.matchedKeywords ?? []), ...p.matchedKeywords])),
      });
  }

  return NextResponse.json({ products: Array.from(map.values()).slice(0, 12) });
}
