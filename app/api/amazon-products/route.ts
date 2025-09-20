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
    AMAZON_MARKETPLACE = "www.amazon.co.jp", // JP
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
  } catch {
    /* noop */
  }

  const keywords = (payload.keywords ?? [])
    .filter((k): k is string => typeof k === "string")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!keywords.length) return NextResponse.json({ products: [] });

  const commonParameters = {
    AccessKey: AMAZON_ACCESS_KEY_ID,
    SecretKey: AMAZON_SECRET_ACCESS_KEY,
    PartnerTag: AMAZON_PARTNER_TAG, // 例: aizubrandhall-22
    PartnerType: "Associates",
    Marketplace: AMAZON_MARKETPLACE, // 例: www.amazon.co.jp
  };

  const resources = [
    "Images.Primary.Medium",
    "ItemInfo.Title",
    "Offers.Listings.Price",
    "CustomerReviews.Count",
    "CustomerReviews.StarRating",
  ];

  const collected: Product[] = [];

  for (const kw of keywords) {
    const requestParameters = {
      Keywords: kw,
      ItemCount: 6,
      Resources: resources,
      SearchIndex: "All",
    };

    try {
      const res: any = await AmazonPaapi.SearchItems(commonParameters, requestParameters);
      const items = res?.SearchResult?.Items ?? [];
      for (const it of items) {
        if (!it?.ASIN || !it?.DetailPageURL) continue;
        const listing = it?.Offers?.Listings?.[0];
        collected.push({
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
      console.error("PAAPI SearchItems error:", e?.message || e);
    }
  }

  // ASINで重複マージ
  const map = new Map<string, Product>();
  for (const p of collected) {
    const ex = map.get(p.asin);
    if (!ex) map.set(p.asin, p);
    else
      map.set(p.asin, {
        ...ex,
        matchedKeywords: Array.from(new Set([...(ex.matchedKeywords ?? []), ...p.matchedKeywords])),
      });
  }

  const merged = Array.from(map.values()).slice(0, 12);
  return NextResponse.json({ products: merged });
}
