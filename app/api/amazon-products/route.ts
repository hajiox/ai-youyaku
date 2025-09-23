export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import aws4 from "aws4";
import crypto from "crypto";

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

const HOST = "webservices.amazon.co.jp";
const PATH = "/paapi5/searchitems";
const SERVICE = "ProductAdvertisingAPI";
const REGION = "us-west-2"; // JPはこれで固定
const TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
const DEFAULT_MARKETPLACE = "www.amazon.co.jp";
const RESOURCES = [
  "Images.Primary.Medium",
  "ItemInfo.Title",
  "Offers.Listings.Price",
  "CustomerReviews.Count",
  "CustomerReviews.StarRating",
];

export async function POST(req: NextRequest) {
  // envはtrimしてから使用（改行/空白混入対策）
  const id = (process.env.AMAZON_ACCESS_KEY_ID || "").trim();
  const secret = (process.env.AMAZON_SECRET_ACCESS_KEY || "").trim();
  const tag = (process.env.AMAZON_PARTNER_TAG || "").trim();
  const marketplace = (process.env.AMAZON_MARKETPLACE || DEFAULT_MARKETPLACE).trim();

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

  if (!keywords.length) return NextResponse.json({ products: [] });

  const all: Product[] = [];

  for (const kw of keywords) {
    const bodyObj = {
      PartnerTag: tag,
      PartnerType: "Associates",
      Marketplace: marketplace,
      Keywords: kw,
      ItemCount: 6,
      SearchIndex: "All",
      Resources: RESOURCES,
    };
    const body = JSON.stringify(bodyObj);
    const payloadHash = crypto.createHash("sha256").update(body).digest("hex");

    // 署名済みリクエストを作成
    const reqOpts: aws4.Request = {
      host: HOST,
      method: "POST",
      path: PATH,
      service: SERVICE,
      region: REGION,
      headers: {
        "content-type": "application/json; charset=UTF-8",
        "x-amz-target": TARGET,
        "x-amz-content-sha256": payloadHash,
        "user-agent": "AIKijiYoyaku/1.0 (+support@aizubrandhall.jp)",
      },
      body,
    };
    aws4.sign(reqOpts, { accessKeyId: id, secretAccessKey: secret });

    try {
      const res = await fetch(`https://${HOST}${PATH}`, {
        method: "POST",
        headers: reqOpts.headers as Record<string, string>,
        body,
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Amazon API error:", res.status, text);
        return NextResponse.json(
          { products: [], error: `Amazon API error ${res.status}`, details: text },
          { status: 502 }
        );
      }

      const data = await res.json();
      const items: any[] = data?.SearchResult?.Items ?? data?.ItemsResult?.Items ?? [];
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
      console.error("Amazon API request failed:", e?.message || String(e));
      return NextResponse.json(
        { products: [], error: "Amazon API request failed", details: e?.message || String(e) },
        { status: 502 }
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
