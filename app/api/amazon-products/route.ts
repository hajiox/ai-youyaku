export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import aws4 from "aws4";

const HOST = "webservices.amazon.co.jp";
const REGION = "us-west-2";
const SERVICE = "ProductAdvertisingAPI";
const TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
const PATH = "/paapi5/searchitems";
const MARKETPLACE = process.env.AMAZON_MARKETPLACE?.trim() || "www.amazon.co.jp";
const RESOURCES = [
  "Images.Primary.Medium",
  "ItemInfo.Title",
  "Offers.Listings.Price",
  "CustomerReviews.Count",
  "CustomerReviews.StarRating",
];

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
    const body = JSON.stringify({
      Keywords: kw,
      Marketplace: MARKETPLACE,
      PartnerTag: partnerTag,
      PartnerType: "Associates",
      SearchIndex: "All",
      ItemCount: 6,
      Resources: RESOURCES,
    });

    const request = {
      host: HOST,
      method: "POST",
      path: PATH,
      service: SERVICE,
      region: REGION,
      body,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Amz-Target": TARGET,
        Accept: "application/json, text/javascript",
        "User-Agent":
          "Mozilla/5.0 (compatible; ai-youyaku/1.0; +support@aizubrandhall.jp)",
      } as Record<string, string>,
    };

    const signed = aws4.sign(request, {
      accessKeyId,
      secretAccessKey: secretKey,
    });

    const signedHeaders = signed.headers ?? {};
    if ("Host" in signedHeaders) {
      delete (signedHeaders as Record<string, string>).Host;
    }
    signedHeaders.host = HOST;

    try {
      const res = await fetch(`https://${HOST}${PATH}`, {
        method: "POST",
        headers: signedHeaders as Record<string, string>,
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
