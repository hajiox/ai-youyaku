export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import AmazonPaapi from "amazon-paapi";

interface AmazonProductResponseItem {
  ASIN?: string;
  DetailPageURL?: string;
  Images?: {
    Primary?: {
      Medium?: {
        URL?: string;
      };
    };
  };
  ItemInfo?: {
    Title?: {
      DisplayValue?: string;
    };
  };
  Offers?: {
    Listings?: Array<{
      Price?: {
        DisplayAmount?: string;
        Amount?: number;
        Currency?: string;
      };
    }>;
  };
  CustomerReviews?: {
    StarRating?: number;
    Count?: number;
  };
}

interface AmazonProduct {
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
}

export async function POST(req: NextRequest) {
  const id = (process.env.AMAZON_ACCESS_KEY_ID || "").trim();
  const secret = (process.env.AMAZON_SECRET_ACCESS_KEY || "").trim();
  const tag = (process.env.AMAZON_PARTNER_TAG || "").trim();
  const marketplace = (process.env.AMAZON_MARKETPLACE || "www.amazon.co.jp").trim();

  if (!id || !secret || !tag) {
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

  if (!keywords.length) {
    return NextResponse.json({ products: [] });
  }

  const commonParameters = {
    AccessKey: id,
    SecretKey: secret,
    PartnerTag: tag,
    PartnerType: "Associates",
    Marketplace: marketplace,
  } as const;

  const resources = [
    "Images.Primary.Medium",
    "ItemInfo.Title",
    "Offers.Listings.Price",
    "CustomerReviews.Count",
    "CustomerReviews.StarRating",
  ];

  const collected: AmazonProduct[] = [];

  for (const kw of keywords) {
    const requestParameters = {
      Keywords: kw,
      ItemCount: 6,
      Resources: resources,
      SearchIndex: "All",
    };

    try {
      const res: any = await AmazonPaapi.SearchItems(commonParameters, requestParameters);
      const items: AmazonProductResponseItem[] = res?.SearchResult?.Items ?? [];

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
      const body = e?.body || e?.message || String(e);
      console.error("PAAPI SearchItems error:", body);
      return NextResponse.json(
        {
          products: [],
          error: "Amazon API error",
          details: body,
          partnerTagUsed: tag,
          marketplace,
        },
        { status: 502 }
      );
    }
  }

  const map = new Map<string, AmazonProduct>();
  for (const product of collected) {
    const existing = map.get(product.asin);
    if (!existing) {
      map.set(product.asin, product);
      continue;
    }
    map.set(product.asin, {
      ...existing,
      matchedKeywords: Array.from(
        new Set([...(existing.matchedKeywords ?? []), ...product.matchedKeywords])
      ),
    });
  }

  return NextResponse.json({ products: Array.from(map.values()).slice(0, 12) });
}
