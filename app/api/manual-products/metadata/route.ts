// /app/api/manual-products/metadata/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const extractMetaContent = (html: string, keys: string[]): string | undefined => {
  for (const key of keys) {
    // property または name 属性の両方に対応する
    const regex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const match = html.match(regex);
    if (match?.[1]) return match[1];
  }
  return undefined;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
        "User-Agent": "Mozilla/5.0 (compatible; ProductMetaFetcher/1.0)",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch product page (${response.status})` },
        { status: 502 },
      );
    }

    const html = await response.text();

    const ogTitle = extractMetaContent(html, ["og:title", "twitter:title", "title"]);
    const ogDescription = extractMetaContent(html, ["og:description", "twitter:description", "description"]);
    const ogImage = extractMetaContent(html, ["og:image", "twitter:image", "twitter:image:src"]);

    return NextResponse.json({
      title: ogTitle,
      description: ogDescription,
      imageUrl: ogImage,
    });
  } catch (error) {
    console.error("Product metadata fetch failed", error);
    return NextResponse.json(
      { error: "メタデータの取得に失敗しました" },
      { status: 500 },
    );
  }
}
