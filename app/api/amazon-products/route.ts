// /app/api/amazon-products/route.ts ver.12
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Amazon PA-API v5の設定
const HOST = "webservices.amazon.co.jp";
const REGION = "us-west-2";
const SERVICE = "ProductAdvertisingAPI";
const TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
const PATH = "/paapi5/searchitems";
const CONTENT_ENCODING = "amz-1.0";
const ALGORITHM = "AWS4-HMAC-SHA256";
const SIGNED_HEADERS = "content-encoding;content-type;host;x-amz-date;x-amz-target";

const RESOURCES = [
  "Images.Primary.Medium",
  "ItemInfo.Title",
  "Offers.Listings.Price",
  "CustomerReviews.Count",
  "CustomerReviews.StarRating",
];

function hash(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function hmac(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = hmac("AWS4" + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
}

function getAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  const amzDate = `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  const dateStamp = `${year}${month}${day}`;
  return { amzDate, dateStamp };
}

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
  matchedKeywords?: string[];
  source?: 'article' | 'aizu-brand';
};

// エラー詳細を返すために戻り値を拡張
async function searchAmazonProducts(
  keyword: string,
  accessKeyId: string,
  secretKey: string,
  partnerTag: string,
  itemCount: number = 6
): Promise<{ products: Product[], error?: string }> {
  const products: Product[] = [];
  
  try {
    const now = new Date();
    const { amzDate, dateStamp } = getAmzDate(now);

    const requestBody = {
      Keywords: keyword,
      PartnerTag: partnerTag,
      PartnerType: "Associates",
      SearchIndex: "All",
      ItemCount: itemCount,
      Resources: RESOURCES,
    };
    const requestPayload = JSON.stringify(requestBody);
    const payloadHash = hash(requestPayload);

    const canonicalHeaders = 
      `content-encoding:${CONTENT_ENCODING}\n` +
      `content-type:application/json; charset=utf-8\n` +
      `host:${HOST}\n` +
      `x-amz-date:${amzDate}\n` +
      `x-amz-target:${TARGET}\n`;

    const canonicalRequest = [
      "POST",
      PATH,
      "",
      canonicalHeaders,
      SIGNED_HEADERS,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
    const stringToSign = [
      ALGORITHM,
      amzDate,
      credentialScope,
      hash(canonicalRequest),
    ].join("\n");

    const signingKey = getSignatureKey(secretKey, dateStamp, REGION, SERVICE);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    const authorizationHeader = `${ALGORITHM} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${SIGNED_HEADERS}, Signature=${signature}`;

    const headers: HeadersInit = {
      "content-encoding": CONTENT_ENCODING,
      "content-type": "application/json; charset=utf-8",
      "host": HOST,
      "x-amz-date": amzDate,
      "x-amz-target": TARGET,
      "Authorization": authorizationHeader,
    };

    const response = await fetch(`https://${HOST}${PATH}`, {
      method: "POST",
      headers,
      body: requestPayload,
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      // ここでエラー内容を特定して返す
      console.error(`Amazon API Error [${keyword}]: ${response.status} - ${responseText}`);
      return { 
        products: [], 
        error: `API Error (${response.status}): ${responseText.substring(0, 200)}...` // エラー内容を切り出して返す
      };
    }

    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return { products: [], error: "JSON Parse Error" };
    }

    const items = data?.SearchResult?.Items || [];
    for (const item of items) {
      if (!item?.ASIN || !item?.DetailPageURL) continue;
      const listing = item?.Offers?.Listings?.[0];
      products.push({
        asin: item.ASIN,
        title: item?.ItemInfo?.Title?.DisplayValue || "",
        url: item.DetailPageURL,
        imageUrl: item?.Images?.Primary?.Medium?.URL,
        price: listing?.Price?.DisplayAmount,
        amount: listing?.Price?.Amount,
        currency: listing?.Price?.Currency,
        rating: item?.CustomerReviews?.StarRating?.DisplayValue,
        reviewCount: item?.CustomerReviews?.Count?.DisplayValue,
      });
    }
  } catch (error) {
    return { products: [], error: error instanceof Error ? error.message : "Unknown Error" };
  }
  
  return { products };
}

export async function POST(req: NextRequest) {
  const accessKeyId = process.env.AMAZON_ACCESS_KEY_ID?.trim();
  const secretKey = process.env.AMAZON_SECRET_ACCESS_KEY?.trim();
  const partnerTag = process.env.AMAZON_PARTNER_TAG?.trim();

  if (!accessKeyId || !secretKey || !partnerTag) {
    return NextResponse.json({ products: [], error: "APIキーが設定されていません" }, { status: 400 });
  }

  let payload: { keywords?: string[] } = {};
  try {
    payload = await req.json();
  } catch (e) {
    console.error(e);
  }

  const keywords = (payload.keywords ?? [])
    .filter((k): k is string => typeof k === "string")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 5);

  const allProducts: Product[] = [];
  const desiredArticleCount = 1;
  const desiredAizuCount = 3;
  
  // デバッグ用エラーメッセージ格納
  let debugErrorMessage = "";

  // 1. 記事連動商品
  if (keywords.length > 0) {
    for (const keyword of keywords) {
      if (allProducts.filter((p) => p.source === "article").length >= desiredArticleCount) break;

      const result = await searchAmazonProducts(keyword, accessKeyId, secretKey, partnerTag, 4);
      
      if (result.error) debugErrorMessage = result.error; // エラーがあれば保存

      const marked = result.products.map((p) => ({
        ...p,
        source: "article" as const,
        matchedKeywords: [keyword],
      }));
      allProducts.push(...marked.slice(0, desiredArticleCount - allProducts.filter((p) => p.source === "article").length));
    }
  }

  // フォールバック（記事連動）
  if (keywords.length > 0 && allProducts.filter((p) => p.source === "article").length === 0) {
    const fallbackKeyword = keywords[0];
    const params = new URLSearchParams({ k: fallbackKeyword, tag: partnerTag });
    allProducts.push({
      asin: `search-${fallbackKeyword}`,
      title: `「${fallbackKeyword}」関連商品をAmazonで探す`,
      url: `https://www.amazon.co.jp/s?${params.toString()}`,
      source: "article",
      matchedKeywords: [fallbackKeyword],
    });
  }

  // 2. 会津ブランド商品
  const aizuBrandKeywords = ["会津ブランド館 チャーシュー", "会津ブランド館 ラーメン", "会津ブランド館 カレー"];
  const aizuProducts: Product[] = [];

  for (const aizuKeyword of aizuBrandKeywords) {
    if (aizuProducts.length >= desiredAizuCount) break;

    const result = await searchAmazonProducts(aizuKeyword, accessKeyId, secretKey, partnerTag, 4);
    
    if (result.error && !debugErrorMessage) debugErrorMessage = result.error;

    result.products.forEach((p) => {
      if (aizuProducts.length < desiredAizuCount) aizuProducts.push({ ...p, source: "aizu-brand" });
    });
  }

  // フォールバック（会津）- 画像URLは空（フロントでNoImage表示）
  const aizuFallbacks: Product[] = [
    {
      asin: "aizu-brand-chashu",
      title: "会津ブランド館 土が育てた じっくり煮込んだ チャーシュー (Amazonで見る)",
      url: `https://www.amazon.co.jp/s?${new URLSearchParams({ k: "会津ブランド館 チャーシュー", tag: partnerTag }).toString()}`,
      imageUrl: "", 
      source: "aizu-brand",
    },
    {
      asin: "aizu-brand-ramen",
      title: "会津ブランド館 会津ラーメン 濃厚スープ (Amazonで見る)",
      url: `https://www.amazon.co.jp/s?${new URLSearchParams({ k: "会津ブランド館 ラーメン", tag: partnerTag }).toString()}`,
      imageUrl: "",
      source: "aizu-brand",
    },
    {
      asin: "aizu-brand-curry",
      title: "会津ブランド館 馬肉カレー (Amazonで見る)",
      url: `https://www.amazon.co.jp/s?${new URLSearchParams({ k: "会津ブランド館 カレー", tag: partnerTag }).toString()}`,
      imageUrl: "",
      source: "aizu-brand",
    },
  ];

  while (aizuProducts.length < desiredAizuCount && aizuFallbacks.length > 0) {
    const nextFallback = aizuFallbacks.shift();
    if (nextFallback) aizuProducts.push(nextFallback);
  }

  const productMap = new Map<string, Product>();
  for (const product of [...allProducts, ...aizuProducts]) {
    const existing = productMap.get(product.asin);
    if (!existing) {
      productMap.set(product.asin, product);
    } else if (existing.source === "article" && product.source === "article") {
      productMap.set(product.asin, {
        ...existing,
        matchedKeywords: Array.from(new Set([...(existing.matchedKeywords || []), ...(product.matchedKeywords || [])])),
      });
    }
  }

  const finalProducts = Array.from(productMap.values())
    .filter((p) => p.source === "article").slice(0, desiredArticleCount)
    .concat(Array.from(productMap.values()).filter((p) => p.source === "aizu-brand").slice(0, desiredAizuCount));
  
  // ★ここがポイント：debugErrorとしてAmazonからの生エラーメッセージをフロントに返す
  return NextResponse.json({ 
    products: finalProducts,
    debugError: debugErrorMessage || null
  });
}
