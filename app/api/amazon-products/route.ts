// /app/api/amazon-products/route.ts ver.5

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Amazon PA-API v5の設定
const HOST = "webservices.amazon.co.jp";
const REGION = "us-west-2"; // PA-API v5では us-west-2 を使用
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

// SHA-256ハッシュを計算
function hash(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

// HMAC-SHA256署名を生成
function hmac(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

// 署名キーを生成
function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Buffer {
  const kDate = hmac("AWS4" + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
}

// 日付フォーマット
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
  matchedKeywords: string[];
};

export async function POST(req: NextRequest) {
  // 環境変数の取得と検証
  const accessKeyId = process.env.AMAZON_ACCESS_KEY_ID?.trim();
  const secretKey = process.env.AMAZON_SECRET_ACCESS_KEY?.trim();
  const partnerTag = process.env.AMAZON_PARTNER_TAG?.trim();

  if (!accessKeyId || !secretKey || !partnerTag) {
    console.error("Missing Amazon API credentials:", {
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretKey,
      hasPartnerTag: !!partnerTag,
    });
    return NextResponse.json(
      { products: [], error: "Amazon APIの資格情報が不足しています。" },
      { status: 400 }
    );
  }

  // リクエストボディの解析
  let payload: { keywords?: string[] } = {};
  try {
    payload = await req.json();
  } catch (e) {
    console.error("Failed to parse request body:", e);
  }

  const keywords = (payload.keywords ?? [])
    .filter((k): k is string => typeof k === "string")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!keywords.length) {
    return NextResponse.json({ products: [] });
  }

  const allProducts: Product[] = [];

  // 各キーワードで商品を検索
  for (const keyword of keywords) {
    try {
      const now = new Date();
      const { amzDate, dateStamp } = getAmzDate(now);

      // リクエストボディの作成
      const requestBody = {
        Keywords: keyword,
        PartnerTag: partnerTag,
        PartnerType: "Associates",
        SearchIndex: "All",
        ItemCount: 6,
        Resources: RESOURCES,
      };
      const requestPayload = JSON.stringify(requestBody);
      const payloadHash = hash(requestPayload);

      // Canonical Headersの作成（アルファベット順）
      const canonicalHeaders = 
        `content-encoding:${CONTENT_ENCODING}\n` +
        `content-type:application/json; charset=utf-8\n` +
        `host:${HOST}\n` +
        `x-amz-date:${amzDate}\n` +
        `x-amz-target:${TARGET}\n`;

      // Canonical Requestの作成
      const canonicalRequest = [
        "POST",
        PATH,
        "", // Query string (empty)
        canonicalHeaders,
        SIGNED_HEADERS,
        payloadHash,
      ].join("\n");

      console.log("Canonical Request:", canonicalRequest);

      // String to Signの作成
      const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
      const stringToSign = [
        ALGORITHM,
        amzDate,
        credentialScope,
        hash(canonicalRequest),
      ].join("\n");

      console.log("String to Sign:", stringToSign);

      // 署名の計算
      const signingKey = getSignatureKey(secretKey, dateStamp, REGION, SERVICE);
      const signature = crypto
        .createHmac("sha256", signingKey)
        .update(stringToSign)
        .digest("hex");

      // Authorization headerの作成
      const authorizationHeader = 
        `${ALGORITHM} ` +
        `Credential=${accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${SIGNED_HEADERS}, ` +
        `Signature=${signature}`;

      // HTTPリクエストヘッダー
      const headers: HeadersInit = {
        "content-encoding": CONTENT_ENCODING,
        "content-type": "application/json; charset=utf-8",
        "host": HOST,
        "x-amz-date": amzDate,
        "x-amz-target": TARGET,
        "Authorization": authorizationHeader,
      };

      console.log("Request Headers:", headers);
      console.log("Request URL:", `https://${HOST}${PATH}`);

      // Amazon PA-APIへのリクエスト
      const response = await fetch(`https://${HOST}${PATH}`, {
        method: "POST",
        headers,
        body: requestPayload,
      });

      const responseText = await response.text();
      console.log("Response Status:", response.status);
      console.log("Response Text:", responseText);

      if (!response.ok) {
        console.error(`Amazon API error for keyword "${keyword}":`, response.status, responseText);
        continue; // 次のキーワードへ
      }

      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse Amazon API response:", e);
        continue;
      }

      // 商品データの抽出
      const items = data?.SearchResult?.Items || [];
      
      for (const item of items) {
        if (!item?.ASIN || !item?.DetailPageURL) continue;
        
        const listing = item?.Offers?.Listings?.[0];
        
        allProducts.push({
          asin: item.ASIN,
          title: item?.ItemInfo?.Title?.DisplayValue || "",
          url: item.DetailPageURL,
          imageUrl: item?.Images?.Primary?.Medium?.URL,
          price: listing?.Price?.DisplayAmount,
          amount: listing?.Price?.Amount,
          currency: listing?.Price?.Currency,
          rating: item?.CustomerReviews?.StarRating?.DisplayValue,
          reviewCount: item?.CustomerReviews?.Count?.DisplayValue,
          matchedKeywords: [keyword],
        });
      }
    } catch (error) {
      console.error(`Failed to search products for keyword "${keyword}":`, error);
      continue;
    }
  }

  // 重複商品のマージ
  const productMap = new Map<string, Product>();
  for (const product of allProducts) {
    const existing = productMap.get(product.asin);
    if (!existing) {
      productMap.set(product.asin, product);
    } else {
      productMap.set(product.asin, {
        ...existing,
        matchedKeywords: Array.from(
          new Set([...existing.matchedKeywords, ...product.matchedKeywords])
        ),
      });
    }
  }

  const finalProducts = Array.from(productMap.values()).slice(0, 12);
  
  console.log(`Returning ${finalProducts.length} products`);
  return NextResponse.json({ products: finalProducts });
}
