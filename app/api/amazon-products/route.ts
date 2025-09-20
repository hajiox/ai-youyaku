export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import AmazonPaapi from "amazon-paapi";

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
  const {
    AMAZON_ACCESS_KEY_ID,
    AMAZON_SECRET_ACCESS_KEY,
    AMAZON_PARTNER_TAG,
    AMAZON_API_REGION = "us-west-2",
    AMAZON_API_HOST = "webservices.amazon.co.jp",
    AMAZON_MARKETPLACE = "www.amazon.co.jp",
  } = process.env;

  if (!AMAZON_ACCESS_KEY_ID || !AMAZON_SECRET_ACCESS_KEY || !AMAZON_PARTNER_TAG) {
    return NextResponse.json({
      products: [],
      error: "Amazon APIの資格情報が設定されていません。",
    });
  }

  let payload: { keywords?: string[] } = {};
  try {
    payload = await req.json();
  } catch (_) {
    /* noop */
  }
  const keywords = (payload.keywords ?? [])
    .filter((k): k is string => typeof k === "string")
    .map(k => k.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!keywords.length) return NextResponse.json({ products: [] });

  const client = new AmazonPaapi({
    accessKey: AMAZON_ACCESS_KEY_ID,
    secretKey: AMAZON_SECRET_ACCESS_KEY,
    partnerTag: AMAZON_PARTNER_TAG,
    partnerType: "Associates",
    region: AMAZON_API_REGION,
    host: AMAZON_API_HOST,
  });

  const resources = [
    "Images.Primary.Medium",
    "ItemInfo.Title",
    "Offers.Listings.Price",
    "CustomerReviews.Count",
    "CustomerReviews.StarRating",
  ];

  const all: Product[] = [];

  for (const kw of keywords) {
    try {
      const res = await client.searchItems({
        Keywords: kw,
        ItemCount: 6,
        Marketplace: AMAZON_MARKETPLACE,
        Resources: resources,
        SearchIndex: "All",
      });

      const items = res?.SearchResult?.Items ?? [];
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
      console.error("PAAPI searchItems error:", e?.message || e);
    }
  }

  const map = new Map<string, Product>();
  for (const p of all) {
    const ex = map.get(p.asin);
    if (!ex) map.set(p.asin, p);
    else
      map.set(p.asin, {
        ...ex,
        matchedKeywords: Array.from(
          new Set([...(ex.matchedKeywords || []), ...p.matchedKeywords]),
        ),
      });
  }

  const merged = Array.from(map.values()).slice(0, 12);
  return NextResponse.json({ products: merged });
}
