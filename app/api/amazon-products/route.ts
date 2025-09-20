export const runtime = "nodejs";

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_HOST = "webservices.amazon.co.jp";
const DEFAULT_REGION = "us-west-2";
const DEFAULT_MARKETPLACE = "www.amazon.co.jp";
const SERVICE = "ProductAdvertisingAPI";
const TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";

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

interface SearchItemsPayload {
  Keywords: string;
  ItemCount: number;
  PartnerTag: string;
  PartnerType: "Associates";
  Marketplace: string;
  Resources: string[];
  SearchIndex: string;
}

type FallbackProduct = AmazonProduct & {
  keywords: string[];
};

const FALLBACK_PRODUCTS: FallbackProduct[] = [
  {
    asin: "B0CNGY8WLC",
    title: "Anker MagGo マグネット式ワイヤレス充電器",
    url: "https://www.amazon.co.jp/dp/B0CNGY8WLC",
    imageUrl:
      "https://images-na.ssl-images-amazon.com/images/I/61Kp6y2QV9L._AC_SL1500_.jpg",
    price: "¥5,990",
    amount: 5990,
    currency: "JPY",
    rating: 4.4,
    reviewCount: 1250,
    matchedKeywords: ["ワイヤレス充電"],
    keywords: ["ガジェット", "充電", "モバイル"],
  },
  {
    asin: "B0C6HXQ8V6",
    title: "Echo Pop (エコーポップ) スマートスピーカー with Alexa",
    url: "https://www.amazon.co.jp/dp/B0C6HXQ8V6",
    imageUrl:
      "https://images-na.ssl-images-amazon.com/images/I/71KccXvH4BL._AC_SL1000_.jpg",
    price: "¥5,980",
    amount: 5980,
    currency: "JPY",
    rating: 4.3,
    reviewCount: 3200,
    matchedKeywords: ["スマート家電"],
    keywords: ["スマートホーム", "IoT", "音声アシスタント"],
  },
  {
    asin: "B0CQYX92TQ",
    title: "Kindle (第11世代) Wi-Fi 16GB 広告つき",
    url: "https://www.amazon.co.jp/dp/B0CQYX92TQ",
    imageUrl:
      "https://images-na.ssl-images-amazon.com/images/I/61N0%2BD0JxzL._AC_SL1500_.jpg",
    price: "¥12,980",
    amount: 12980,
    currency: "JPY",
    rating: 4.5,
    reviewCount: 8600,
    matchedKeywords: ["電子書籍"],
    keywords: ["読書", "デジタルデバイス", "学習"],
  },
  {
    asin: "B0BD2R8GLQ",
    title: "ロジクール G502 X PLUS ゲーミングマウス",
    url: "https://www.amazon.co.jp/dp/B0BD2R8GLQ",
    imageUrl:
      "https://images-na.ssl-images-amazon.com/images/I/61pY4v8Y4hL._AC_SL1500_.jpg",
    price: "¥17,800",
    amount: 17800,
    currency: "JPY",
    rating: 4.6,
    reviewCount: 2100,
    matchedKeywords: ["ゲーミング"],
    keywords: ["PCアクセサリ", "ゲーム", "テクノロジー"],
  },
  {
    asin: "B09PRZ4MZT",
    title: "BALMUDA (バルミューダ) The Brew コーヒーメーカー",
    url: "https://www.amazon.co.jp/dp/B09PRZ4MZT",
    imageUrl:
      "https://images-na.ssl-images-amazon.com/images/I/61BRqBpJ%2ByL._AC_SL1500_.jpg",
    price: "¥64,900",
    amount: 64900,
    currency: "JPY",
    rating: 4.1,
    reviewCount: 340,
    matchedKeywords: ["コーヒー"],
    keywords: ["キッチン", "ライフスタイル", "家電"],
  },
  {
    asin: "B0CNHF1LZP",
    title: "Fire TV Stick 4K 第2世代",
    url: "https://www.amazon.co.jp/dp/B0CNHF1LZP",
    imageUrl:
      "https://images-na.ssl-images-amazon.com/images/I/51QJgKVH6PL._AC_SL1000_.jpg",
    price: "¥7,480",
    amount: 7480,
    currency: "JPY",
    rating: 4.5,
    reviewCount: 15000,
    matchedKeywords: ["ストリーミング"],
    keywords: ["エンタメ", "映像", "家電"],
  },
];

const AIZU_BRAND_PRODUCTS: AmazonProduct[] = [
  {
    asin: "AIZU-URUSHI-CHOPSTICKS",
    title: "会津塗 蒔絵夫婦箸セット（桜）",
    url: "https://aizu-brandkan.com/shopdetail/000000000001/",
    imageUrl:
      "https://aizu-brandkan.com/shopimages/hpgi/0000000000012.jpg",
    price: "¥4,180",
    amount: 4180,
    currency: "JPY",
    matchedKeywords: [],
  },
  {
    asin: "AIZU-MOMEN-STOLE",
    title: "会津木綿 ハンドメイドストール（藍色）",
    url: "https://aizu-brandkan.com/shopdetail/000000000245/",
    imageUrl:
      "https://aizu-brandkan.com/shopimages/hpgi/0000000000245.jpg",
    price: "¥6,050",
    amount: 6050,
    currency: "JPY",
    matchedKeywords: [],
  },
  {
    asin: "AIZU-AKABEKO-M",
    title: "会津張子 赤べこ（中）",
    url: "https://aizu-brandkan.com/shopdetail/000000000072/",
    imageUrl:
      "https://aizu-brandkan.com/shopimages/hpgi/0000000000072.jpg",
    price: "¥2,200",
    amount: 2200,
    currency: "JPY",
    matchedKeywords: [],
  },
  {
    asin: "AIZU-SAKE-SUEHIRO",
    title: "末廣酒造 純米吟醸 伝承山廃 720ml",
    url: "https://aizu-brandkan.com/shopdetail/000000000356/",
    imageUrl:
      "https://aizu-brandkan.com/shopimages/hpgi/0000000000356.jpg",
    price: "¥1,980",
    amount: 1980,
    currency: "JPY",
    matchedKeywords: [],
  },
  {
    asin: "AIZU-LACQUER-CARDCASE",
    title: "会津塗 蒔絵カードケース 鶴ヶ城",
    url: "https://aizu-brandkan.com/shopdetail/000000000198/",
    imageUrl:
      "https://aizu-brandkan.com/shopimages/hpgi/0000000000198.jpg",
    price: "¥3,850",
    amount: 3850,
    currency: "JPY",
    matchedKeywords: [],
  },
  {
    asin: "AIZU-DRIED-PERSIMMON",
    title: "会津みしらず柿 ドライフルーツ",
    url: "https://aizu-brandkan.com/shopdetail/000000000412/",
    imageUrl:
      "https://aizu-brandkan.com/shopimages/hpgi/0000000000412.jpg",
    price: "¥1,404",
    amount: 1404,
    currency: "JPY",
    matchedKeywords: [],
  },
];

const getFallbackProducts = (keywords: string[]): AmazonProduct[] => {
  if (keywords.length === 0) {
    return [];
  }

  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());

  const matched = FALLBACK_PRODUCTS.filter((product) =>
    product.keywords.some((productKeyword) =>
      normalizedKeywords.some((keyword) =>
        productKeyword.toLowerCase().includes(keyword) ||
        keyword.includes(productKeyword.toLowerCase())
      )
    )
  );

  const source = matched.length > 0 ? matched : FALLBACK_PRODUCTS;

  return source.slice(0, 6).map((product) => {
    const matchedKeywords = new Set(product.matchedKeywords);

    normalizedKeywords.forEach((keyword, index) => {
      const originalKeyword = keywords[index];
      if (
        product.keywords.some((productKeyword) =>
          productKeyword.toLowerCase().includes(keyword) ||
          keyword.includes(productKeyword.toLowerCase())
        )
      ) {
        matchedKeywords.add(originalKeyword);
      }
    });

    return {
      asin: product.asin,
      title: product.title,
      url: product.url,
      imageUrl: product.imageUrl,
      price: product.price,
      amount: product.amount,
      currency: product.currency,
      rating: product.rating,
      reviewCount: product.reviewCount,
      matchedKeywords: Array.from(matchedKeywords),
    };
  });
};

const buildSigningKey = (secretKey: string, dateStamp: string, region: string) => {
  const kDate = crypto
    .createHmac("sha256", "AWS4" + secretKey)
    .update(dateStamp)
    .digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(SERVICE).digest();
  return crypto.createHmac("sha256", kService).update("aws4_request").digest();
};

const signRequest = (
  body: string,
  accessKeyId: string,
  secretKey: string,
  host: string,
  region: string
) => {
  const method = "POST";
  const canonicalUri = "/paapi5/searchitems";
  const canonicalQuery = "";
  const contentType = "application/json; charset=UTF-8";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\..+/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = crypto.createHash("sha256").update(body).digest("hex");
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${TARGET}\n`;
  const signedHeaders =
    "content-type;host;x-amz-content-sha256;x-amz-date;x-amz-target";
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const signingKey = buildSigningKey(secretKey, dateStamp, region);
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    headers: {
      "content-type": contentType,
      "x-amz-date": amzDate,
      "x-amz-target": TARGET,
      "x-amz-content-sha256": payloadHash,
      "User-Agent": "AIKijiYoyaku/1.0 (+support@aizubrandhall.jp)",
      Authorization: authorization,
    },
    path: canonicalUri,
  };
};

const extractProducts = (
  items: AmazonProductResponseItem[] = [],
  keyword: string
): AmazonProduct[] => {
  return items
    .filter((item) => item.ASIN && item.DetailPageURL)
    .map((item) => {
      const listing = item.Offers?.Listings?.[0];
      const existingPrice = listing?.Price;

      return {
        asin: item.ASIN as string,
        title: item.ItemInfo?.Title?.DisplayValue || "",
        url: item.DetailPageURL as string,
        imageUrl: item.Images?.Primary?.Medium?.URL,
        price: existingPrice?.DisplayAmount,
        amount: existingPrice?.Amount,
        currency: existingPrice?.Currency,
        rating: item.CustomerReviews?.StarRating,
        reviewCount: item.CustomerReviews?.Count,
        matchedKeywords: [keyword],
      };
    });
};

const mergeProducts = (collections: AmazonProduct[][]): AmazonProduct[] => {
  const mergedMap = new Map<string, AmazonProduct>();

  collections.flat().forEach((product) => {
    const existing = mergedMap.get(product.asin);
    if (existing) {
      const keywords = new Set([
        ...(existing.matchedKeywords || []),
        ...product.matchedKeywords,
      ]);
      mergedMap.set(product.asin, {
        ...existing,
        matchedKeywords: Array.from(keywords),
      });
    } else {
      mergedMap.set(product.asin, product);
    }
  });

  return Array.from(mergedMap.values());
};

export async function POST(req: NextRequest) {
  let payload: { keywords?: string[] };
  try {
    payload = await req.json();
  } catch (error) {
    return NextResponse.json(
      {
        products: [],
        error: "リクエスト形式が正しくありません。",
      },
      { status: 400 }
    );
  }

  const keywords = (payload.keywords || [])
    .map((keyword) => (typeof keyword === "string" ? keyword.trim() : ""))
    .filter((keyword) => keyword.length > 0)
    .slice(0, 5);

  if (keywords.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const {
    AMAZON_ACCESS_KEY_ID,
    AMAZON_SECRET_ACCESS_KEY,
    AMAZON_PARTNER_TAG,
    AMAZON_API_REGION,
    AMAZON_API_HOST,
    AMAZON_MARKETPLACE,
  } = process.env;

  const accessKeyId = AMAZON_ACCESS_KEY_ID;
  const secretAccessKey = AMAZON_SECRET_ACCESS_KEY;
  const partnerTag = AMAZON_PARTNER_TAG;

  if (!accessKeyId || !secretAccessKey || !partnerTag) {
    return NextResponse.json({
      products: getFallbackProducts(keywords),
      error: "Amazon APIの資格情報が設定されていません。サンプル商品を表示しています。",
    });
  }

  const host = AMAZON_API_HOST || DEFAULT_HOST;
  const region = AMAZON_API_REGION || DEFAULT_REGION;
  const marketplace = AMAZON_MARKETPLACE || DEFAULT_MARKETPLACE;

  const baseBody: Omit<SearchItemsPayload, "Keywords"> = {
    ItemCount: 5,
    PartnerTag: partnerTag,
    PartnerType: "Associates",
    Marketplace: marketplace,
    Resources: ["ItemInfo.Title"],
    SearchIndex: "All",
  };

  const results: AmazonProduct[][] = [];
  for (const keyword of keywords) {
    const body: SearchItemsPayload = {
      ...baseBody,
      Keywords: keyword,
    };

    const bodyString = JSON.stringify(body);
    const { headers, path } = signRequest(
      bodyString,
      accessKeyId,
      secretAccessKey,
      host,
      region
    );

    try {
      const response = await fetch(`https://${host}${path}`, {
        method: "POST",
        headers,
        body: bodyString,
        cache: "no-store",
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Amazon API error", response.status, errorBody);

        return NextResponse.json(
          {
            products: [],
            error: `Amazon API error ${response.status}`,
            details: errorBody,
          },
          { status: 200 }
        );
      }

      const data = await response.json();
      const items = data?.SearchResult?.Items as
        | AmazonProductResponseItem[]
        | undefined;
      results.push(extractProducts(items, keyword));
    } catch (error) {
      console.error("Amazon API request failed", error);
    }
  }

  const merged = mergeProducts(results).slice(0, 12);

  if (merged.length === 0) {
    return NextResponse.json({
      products: AIZU_BRAND_PRODUCTS,
      error: "Amazon商品の取得に失敗したため、会津ブランド館の商品を表示しています。",
    });
  }

  return NextResponse.json({ products: merged });
}
