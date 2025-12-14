// /app/api/manual-products/metadata/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const extractMetaContent = (html: string, property: string): string | undefined => {
  const regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
  const match = html.match(regex);
  return match?.[1];
};

const extractJsonLdProduct = (html: string): Record<string, any> | undefined => {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const script of scripts) {
    try {
      const jsonText = script[1].trim();
      const parsed = JSON.parse(jsonText);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const candidate of candidates) {
        if (candidate?.["@type"] === "Product") {
          return candidate;
        }
      }
    } catch (error) {
      // JSONパースに失敗した場合は次の候補をチェック
      continue;
    }
  }

  return undefined;
};

const formatPrice = (price?: string | number, currency?: string) => {
  if (!price) return undefined;

  const numeric = typeof price === "number" ? price : Number(price);
  if (!Number.isNaN(numeric)) {
    const prefix = currency === "JPY" || currency === "¥" || !currency ? "¥" : `${currency} `;
    return `${prefix}${numeric.toLocaleString("ja-JP")}`;
  }

  return typeof price === "string" ? price : undefined;
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

    const ogTitle = extractMetaContent(html, "og:title");
    const ogImage = extractMetaContent(html, "og:image");
    const ogPrice = extractMetaContent(html, "og:price:amount");
    const ogCurrency = extractMetaContent(html, "og:price:currency");

    const productJsonLd = extractJsonLdProduct(html);

    const name = productJsonLd?.name || ogTitle;
    const image = productJsonLd?.image || ogImage;
    const price = productJsonLd?.offers?.price || ogPrice;
    const currency = productJsonLd?.offers?.priceCurrency || ogCurrency;

    return NextResponse.json({
      title: typeof name === "string" ? name : undefined,
      imageUrl: typeof image === "string" ? image : Array.isArray(image) ? image[0] : undefined,
      price: formatPrice(price, currency),
      currency: currency || undefined,
    });
  } catch (error) {
    console.error("Product metadata fetch failed", error);
    return NextResponse.json(
      { error: "メタデータの取得に失敗しました" },
      { status: 500 },
    );
  }
}
