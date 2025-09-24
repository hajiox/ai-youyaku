// /app/api/amazon-products/route.ts ver.4

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const HOST = "webservices.amazon.co.jp";
const REGION = "ap-northeast-1";
const SERVICE = "ProductAdvertisingAPI";
const TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
const PATH = "/paapi5/searchitems";

const RESOURCES = [
  "Images.Primary.Medium",
  "ItemInfo.Title",
  "Offers.Listings.Price",
  "CustomerReviews.Count",
  "CustomerReviews.StarRating",
];

// SHA-256ハッシュを計算する汎用関数
function hash(string: string) {
  return crypto.createHash("sha256").update(string).digest("hex");
}

// HMAC-SHA256署名を生成する汎用関数
function hmac(key: Buffer, string: string) {
  return crypto.createHmac("sha256", key).update(string).digest();
}

// 署名キーを派生させる関数
function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
  const kDate = hmac(Buffer.from("AWS4" + key, "utf8"), dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
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
    const now = new Date();
    const isoDate = now.toISOString().replace(/-/g, "").replace(/:/g, "").slice(0, 15) + "Z";
    const dateStamp = isoDate.slice(0, 8);

    const bodyObj = {
      Keywords: kw,
      PartnerTag: partnerTag,
      PartnerType: "Associates",
      SearchIndex: "All",
      ItemCount: 6,
      Resources: RESOURCES,
    } as const;
    const requestPayload = JSON.stringify(bodyObj);

    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${HOST}\nx-amz-date:${isoDate}\nx-amz-target:${TARGET}\n`;
    const signedHeaders = "content-type;host;x-amz-date;x-amz-target";
    const payloadHash = hash(requestPayload);

    const canonicalRequest = `POST\n${PATH}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const stringToSign = `AWS4-HMAC-SHA256\n${isoDate}\n${dateStamp}/${REGION}/${SERVICE}/aws4_request\n${hash(canonicalRequest)}`;

    const signature = crypto
      .createHmac("sha256", getSignatureKey(secretKey, dateStamp, REGION, SERVICE))
      .update(stringToSign)
      .digest("hex");

    const authorizationHeader =
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${dateStamp}/${REGION}/${SERVICE}/aws4_request, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      "content-type": "application/json; charset=utf-8",
      "x-amz-date": isoDate,
      "x-amz-target": TARGET,
      Authorization: authorizationHeader,
      "x-amz-content-sha256": payloadHash,
    };

    try {
      const res = await fetch(`https://${HOST}${PATH}`, {
        method: "POST",
        headers,
        body: requestPayload,
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
