// /app/api/amazon-products/route.ts ver.18 - 表示件数変更版
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabaseクライアントの作成
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// キャッシュを無効化（常にランダムな結果を返すため）
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { isMobile } = await req.json();

    // ★変更点: 表示件数を変更 (PC: 4件, スマホ: 2件)
    const limit = isMobile ? 2 : 4;

    // 1. registered_linksテーブルから有効なリンクを全件取得
    const { data: links, error } = await supabase
      .from("registered_links")
      .select("id, title, url, ogp_image_url")
      .eq("is_active", true);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ products: [] }); // エラー時は空配列
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // 2. 配列をシャッフル (Fisher-Yates algorithm)
    const shuffled = [...links];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 3. 指定件数だけ切り出す
    const selectedLinks = shuffled.slice(0, limit);

    // 4. フロントエンドの形式に合わせて変換
    const products = selectedLinks.map((link) => ({
      asin: link.id, // IDとして使用
      title: link.title || "No Title",
      url: link.url,
      imageUrl: link.ogp_image_url || null,
      source: "registered-link",
    }));

    return NextResponse.json({ products });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ products: [] });
  }
}
