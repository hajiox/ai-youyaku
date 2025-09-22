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

const buildSigningKey = (secretKey: string, dateStamp: string, region: string) => {
  const kDate = crypto
    .createHmac("sha256", "AWS4" + secretKey)
    .update(dateStamp)
    .digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(SERVICE).digest();
  return crypto.createHmac("sha256", kService).update("aws4_request").digest();
};

const normalizeHost = (host: string) =>
  host.replace(/^https?:\/\//, "").replace(/\/+$/, "");

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
      Accept: "application/json",
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
  try {
    const payload = await req.json();

    const keywords = (payload?.keywords || [])
      .map((keyword: unknown) => (typeof keyword === "string" ? keyword.trim() : ""))
      .filter((keyword: string) => keyword.length > 0)
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

    if (!AMAZON_ACCESS_KEY_ID || !AMAZON_SECRET_ACCESS_KEY || !AMAZON_PARTNER_TAG) {
      throw new Error("Amazon API credentials are not configured.");
    }

    const host = normalizeHost(AMAZON_API_HOST || DEFAULT_HOST);
    const region = AMAZON_API_REGION || DEFAULT_REGION;
    const marketplace = AMAZON_MARKETPLACE || DEFAULT_MARKETPLACE;

    const baseBody: Omit<SearchItemsPayload, "Keywords"> = {
      ItemCount: 5,
      PartnerTag: AMAZON_PARTNER_TAG,
      PartnerType: "Associates",
      Marketplace: marketplace,
      Resources: [
        "Images.Primary.Medium",
        "ItemInfo.Title",
        "Offers.Listings.Price",
        "CustomerReviews.Count",
        "CustomerReviews.StarRating",
      ],
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
        AMAZON_ACCESS_KEY_ID,
        AMAZON_SECRET_ACCESS_KEY,
        host,
        region
      );

      const response = await fetch(`https://${host}${path}`, {
        method: "POST",
        headers,
        body: bodyString,
        cache: "no-store",
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Amazon API error ${response.status}: ${errorBody || response.statusText}`
        );
      }

      const data = await response.json();
      const items = data?.SearchResult?.Items as
        | AmazonProductResponseItem[]
        | undefined;
      results.push(extractProducts(items, keyword));
    }

    const merged = mergeProducts(results).slice(0, 12);

    return NextResponse.json({ products: merged });
  } catch (err: unknown) {
    const error = err as { message?: string } | string;
    console.error("Amazon API error:", err);
    return NextResponse.json(
      {
        error: "Amazon API error",
        details: typeof error === "string" ? error : error?.message,
      },
      { status: 500 }
    );
  }
}
