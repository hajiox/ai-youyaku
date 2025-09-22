export const runtime = "nodejs";

import { Configuration, DefaultApi } from "paapi5-nodejs-sdk";
import { NextRequest, NextResponse } from "next/server";

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

const DEFAULT_MARKETPLACE = "www.amazon.co.jp";

const Resources = [
  "Images.Primary.Medium",
  "ItemInfo.Title",
  "Offers.Listings.Price",
  "CustomerReviews.Count",
  "CustomerReviews.StarRating",
];

const apiCache = new Map<string, DefaultApi>();

function getApiClient(marketplace: string) {
  const cached = apiCache.get(marketplace);
  if (cached) return cached;

  const id = (process.env.AMAZON_ACCESS_KEY_ID || "").trim();
  const secret = (process.env.AMAZON_SECRET_ACCESS_KEY || "").trim();
  const tag = (process.env.AMAZON_PARTNER_TAG || "").trim();

  if (!id || !secret || !tag) {
    throw new Error("Amazon APIの資格情報が不足しています。");
  }

  const configuration = new Configuration({
    accessKey: id,
    secretKey: secret,
    partnerTag: tag,
    partnerType: "Associates",
    marketplace,
  });

  const api = new DefaultApi(configuration);
  apiCache.set(marketplace, api);
  return api;
}

export async function POST(req: NextRequest) {
  const marketplace = (process.env.AMAZON_MARKETPLACE || DEFAULT_MARKETPLACE).trim();

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

  let api: DefaultApi;
  try {
    api = getApiClient(marketplace);
  } catch (error: any) {
    return NextResponse.json(
      {
        products: [],
        error: error?.message || "Amazon APIの資格情報が不足しています。",
      },
      { status: 400 }
    );
  }

  for (const kw of keywords) {
    try {
      const response = await api.searchItems({
        Keywords: kw,
        ItemCount: 6,
        SearchIndex: "All",
        Resources,
      });

      const items: any[] =
        (response as any)?.SearchResult?.Items ??
        (response as any)?.ItemsResult?.Items ??
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
      const status = e?.statusCode || e?.status || 502;
      const message = e?.message || String(e);
      const details =
        e?.body?.Errors?.[0]?.Message || e?.body?.message || e?.response?.body || undefined;

      console.error("Amazon API request failed:", message, details);
      return NextResponse.json(
        {
          products: [],
          error: "Amazon API request failed",
          details: details ?? message,
        },
        { status }
      );
    }
  }

  // ASINで重複マージ
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
