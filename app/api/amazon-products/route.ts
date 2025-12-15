// /app/api/amazon-products/route.ts ver.15 (手動登録データ表示版)
export const runtime = "nodejs";

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Product = {
  asin: string;
  title: string;
  url: string;
  imageUrl?: string;
  price?: string;
  matchedKeywords?: string[];
  source?: "aizu-brand";
  description?: string;
};

// --- Supabase設定 ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
// クライアント初期化（環境変数がない場合はnullにしてエラー回避）
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const formatPrice = (price: unknown): string | undefined => {
  if (typeof price === "number") {
    return `¥${price.toLocaleString("ja-JP")}`;
  }

  if (typeof price === "string" && price.trim().length > 0) {
    const numeric = Number(price.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(numeric)) {
      return `¥${numeric.toLocaleString("ja-JP")}`;
    }
    return price;
  }

  return undefined;
};

// 手動登録の商品を取得
async function fetchManualProducts(): Promise<Product[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("manual_products")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("Supabase fetch error:", error);
    return [];
  }

  return data.map((item: any) => ({
    asin: item.id || `manual-${crypto.randomUUID()}`,
    title: item.title,
    url: item.url,
    imageUrl: item.image_url,
    price: formatPrice(item.price),
    description: item.description,
    source: "aizu-brand",
  }));
}

// --- メイン処理 ---
export async function POST(req: NextRequest) {
  let payload: { keywords?: string[] } = {};
  try {
    payload = await req.json();
  } catch (e) {
    /* payloadなしでも動作させる */
  }

  const keywords = (payload.keywords ?? []).slice(0, 5);
  const manualProducts = await fetchManualProducts();

  const productsWithTags = manualProducts.map((product) => ({
    ...product,
    matchedKeywords: keywords,
  }));

  const fallbackProducts = manualProducts.length > 0
    ? []
    : [{
        asin: "manual-fallback-1",
        title: "おすすめリンクが登録されていません",
        url: "https://example.com/",
        source: "aizu-brand" as const,
      }];

  return NextResponse.json({
    products: [...productsWithTags, ...fallbackProducts],
  });
}
