// /app/api/manual-products/metadata/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const extractMetaContent = (html: string, property: string): string | undefined => {
  const propertyRegex = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const nameRegex = new RegExp(
    `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );

  const byProperty = html.match(propertyRegex)?.[1];
  if (byProperty) return byProperty;

  return html.match(nameRegex)?.[1];
};

const extractTitleTag = (html: string): string | undefined => {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1];
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

    const ogTitle = extractMetaContent(html, "og:title") || extractTitleTag(html);
    const ogDescription =
      extractMetaContent(html, "og:description") || extractMetaContent(html, "description");

    return NextResponse.json({
      title: typeof ogTitle === "string" ? ogTitle : undefined,
      description: typeof ogDescription === "string" ? ogDescription : undefined,
    });
  } catch (error) {
    console.error("Product metadata fetch failed", error);
    return NextResponse.json(
      { error: "メタデータの取得に失敗しました" },
      { status: 500 },
    );
  }
}
