// /app/api/amazon-products/route.ts ver.15 (登録リンク表示版)
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import crypto from "crypto";

// --- Supabase設定 ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// --- Amazon API設定 ---
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

// --- 署名関数 ---
function hash(data: string) { return crypto.createHash("sha256").update(data, "utf8").digest("hex"); }
function hmac(key: string | Buffer, data: string) { return crypto.createHmac("sha256", key).update(data, "utf8").digest(); }
function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
  const kDate = hmac("AWS4" + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
}
function getAmzDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return { amzDate: `${year}${month}${day}T${hours}${minutes}${seconds}Z`, dateStamp: `${year}${month}${day}` };
}

// --- 型定義 ---
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
  source?: 'article' | 'registered-link';
};

// --- Amazon API検索関数 ---
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
    const requestBody = JSON.stringify({
      Keywords: keyword, PartnerTag: partnerTag, PartnerType: "Associates", SearchIndex: "All", ItemCount: itemCount, Resources: RESOURCES,
    });
    const payloadHash = hash(requestBody);
    const canonicalHeaders = `content-encoding:${CONTENT_ENCODING}\ncontent-type:application/json; charset=utf-8\nhost:${HOST}\nx-amz-date:${amzDate}\nx-amz-target:${TARGET}\n`;
    const canonicalRequest = `POST\n${PATH}\n\n${canonicalHeaders}\n${SIGNED_HEADERS}\n${payloadHash}`;
    const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
    const stringToSign = `${ALGORITHM}\n${amzDate}\n${credentialScope}\n${hash(canonicalRequest)}`;
    const signingKey = getSignatureKey(secretKey, dateStamp, REGION, SERVICE);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    const authorizationHeader = `${ALGORITHM} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${SIGNED_HEADERS}, Signature=${signature}`;

    const response = await fetch(`https://${HOST}${PATH}`, {
      method: "POST",
      headers: {
        "content-encoding": CONTENT_ENCODING, "content-type": "application/json; charset=utf-8", "host": HOST, "x-amz-date": amzDate, "x-amz-target": TARGET, "Authorization": authorizationHeader,
      },
      body: requestBody,
    });

    const responseText = await response.text();
    if (!response.ok) {
      let errorMsg = `Status ${response.status}`;
      try {
        const errJson = JSON.parse(responseText);
        if (errJson.Errors?.[0]) errorMsg = `${errJson.Errors[0].Code}`;
      } catch (e) {}
      return { products: [], error: errorMsg };
    }

    const data = JSON.parse(responseText);
    const items = data?.SearchResult?.Items || [];
    for (const item of items) {
      if (!item?.ASIN || !item?.DetailPageURL) continue;
      products.push({
        asin: item.ASIN,
        title: item?.ItemInfo?.Title?.DisplayValue || "",
        url: item.DetailPageURL,
        imageUrl: item?.Images?.Primary?.Medium?.URL,
        price: item?.Offers?.Listings?.[0]?.Price?.DisplayAmount,
        source: 'article'
      });
    }
  } catch (error) {
    return { products: [], error: error instanceof Error ? error.message : "Unknown Error" };
  }
  return { products };
}

// --- 配列からランダムに要素を取得 ---
function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// --- メイン処理 ---
export async function POST(req: NextRequest) {
  const accessKeyId = process.env.AMAZON_ACCESS_KEY_ID?.trim();
  const secretKey = process.env.AMAZON_SECRET_ACCESS_KEY?.trim();
  const partnerTag = process.env.AMAZON_PARTNER_TAG?.trim();

  let payload: { keywords?: string[], isMobile?: boolean } = {};
  try { payload = await req.json(); } catch (e) {}
  const keywords = (payload.keywords ?? []).slice(0, 5);
  const isMobile = payload.isMobile ?? false; // クライアントからモバイル判定を受け取る
  
  const allProducts: Product[] = [];
  const desiredArticleCount = 1;
  let amazonApiError = "";

  // 1. 記事連動商品 (Amazon API)
  if (accessKeyId && secretKey && partnerTag && keywords.length > 0) {
    for (const keyword of keywords) {
      if (allProducts.length >= desiredArticleCount) break;
      const result = await searchAmazonProducts(keyword, accessKeyId, secretKey, partnerTag, 4);
      if (result.error) amazonApiError = result.error;
      
      const marked = result.products.map(p => ({ ...p, source: "article" as const, matchedKeywords: [keyword] }));
      allProducts.push(...marked.slice(0, desiredArticleCount - allProducts.length));
    }
  }

  // 記事連動のフォールバック (検索リンク)
  if (allProducts.length === 0 && keywords.length > 0) {
    const k = keywords[0];
    allProducts.push({
      asin: `search-${k}`,
      title: `「${k}」関連商品をAmazonで探す`,
      url: `https://www.amazon.co.jp/s?k=${encodeURIComponent(k)}&tag=${partnerTag || ''}`,
      source: "article",
      matchedKeywords: [k],
    });
  }

  // 2. 登録リンク (Supabaseから取得してランダム表示)
  let registeredLinks: Product[] = [];
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('registered_links')
        .select('*')
        .eq('is_active', true);
      
      if (data && data.length > 0) {
        // PC: 2個、スマホ: 1個をランダムに選択
        const displayCount = isMobile ? 1 : 2;
        const randomLinks = getRandomItems(data, displayCount);
        
        registeredLinks = randomLinks.map((item: any) => ({
          asin: item.id,
          title: item.title,
          url: item.url,
          imageUrl: item.ogp_image_url,
          source: 'registered-link',
        }));
      }
    } catch (e) {
      console.error("Supabase fetch error:", e);
    }
  }

  // 最終データ結合
  const finalProducts = [...allProducts, ...registeredLinks];

  // エラーメッセージ制御
  const displayError = (registeredLinks.length > 0) 
    ? null 
    : amazonApiError;

  return NextResponse.json({ 
    products: finalProducts,
    debugError: displayError
  });
}
