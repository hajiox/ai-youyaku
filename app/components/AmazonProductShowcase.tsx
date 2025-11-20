// /app/components/AmazonProductShowcase.tsx
import Image from "next/image";
import { useMemo, useState } from "react";

type AmazonProduct = {
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
};

type AmazonProductShowcaseProps = {
  keywords: string[];
  products: AmazonProduct[];
  isLoading: boolean;
  error: string | null;
  partnerTag?: string;
};

const formatRating = (rating?: number) => {
  if (!rating) return null;
  return Math.round(rating * 10) / 10;
};

const renderStars = (rating?: number) => {
  if (!rating) return null;
  const rounded = Math.round(rating * 2) / 2;
  const fullStars = Math.floor(rounded);
  const hasHalf = rounded - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <span className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: fullStars }).map((_, idx) => (
        <span key={`full-${idx}`}>★</span>
      ))}
      {hasHalf && <span className="text-amber-400">☆</span>}
      {Array.from({ length: emptyStars }).map((_, idx) => (
        <span key={`empty-${idx}`} className="text-slate-300">
          ☆
        </span>
      ))}
    </span>
  );
};

// 画像表示を管理する個別のコンポーネント（エラーハンドリング用）
const ProductImage = ({ product }: { product: AmazonProduct }) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(product.imageUrl);
  const [hasError, setHasError] = useState(false);

  // 画像URLがない、またはロードエラーが発生した場合のフォールバック表示
  if (!imgSrc || hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 text-slate-400">
        <span className="text-2xl">📷</span>
        <span className="mt-2 text-xs font-medium">No Image</span>
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={product.title}
      fill
      className="object-contain p-3 transition duration-300 group-hover:scale-105"
      sizes="(max-width: 1024px) 50vw, 280px"
      onError={() => {
        // 画像の読み込みに失敗したらエラー状態にする
        setHasError(true);
      }}
      unoptimized // 外部URLの画像を最適化せずに表示（Amazon画像用）
    />
  );
};

const AmazonProductShowcase = ({
  keywords,
  products,
  isLoading,
  error,
  partnerTag,
}: AmazonProductShowcaseProps) => {
  const displayKeywords = useMemo(() => keywords.slice(0, 5), [keywords]);
  const fallbackSearches = useMemo(() => {
    if (displayKeywords.length === 0) return [];
    return displayKeywords.slice(0, 3).map((keyword) => {
      const params = new URLSearchParams({ k: keyword });
      if (partnerTag) {
        params.set("tag", partnerTag);
      }
      return {
        keyword,
        url: `https://www.amazon.co.jp/s?${params.toString()}`,
      };
    });
  }, [displayKeywords, partnerTag]);

  const shouldRender = isLoading || error || products.length > 0 || keywords.length > 0;

  if (!shouldRender) {
    return null;
  }

  return (
    <aside className="w-full rounded-2xl bg-gradient-to-br from-amber-50 via-white to-sky-50 p-6 shadow-sm ring-1 ring-amber-100/60">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            おすすめアイテム
          </p>
          <h2 className="text-xl font-bold text-slate-700">
            要約内容に合わせたAmazon商品
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            要約文から抽出したキーワードをもとに関連商品の候補をピックアップします。
          </p>
        </div>
        {displayKeywords.length > 0 && (
          <div className="hidden flex-wrap justify-end gap-1 text-xs text-amber-700 sm:flex">
            {displayKeywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-amber-100 px-3 py-1 font-medium"
              >
                #{keyword}
              </span>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex animate-pulse flex-col rounded-xl border border-white/70 bg-white/60 p-4 shadow-sm"
            >
              <div className="mb-3 aspect-square w-full rounded-lg bg-slate-200" />
              <div className="mb-2 h-3 rounded bg-slate-200" />
              <div className="mb-1 h-3 w-3/4 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && products.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {products.map((product) => (
            <article
              key={product.asin}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/80 bg-white/80 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-48 w-full overflow-hidden bg-white">
                {/* エラーハンドリング機能付きの画像コンポーネント */}
                <ProductImage product={product} />
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h3
                  className="text-sm font-semibold leading-snug text-slate-700"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {product.title || "商品名不明"}
                </h3>

                {product.price && (
                  <p className="mt-2 text-lg font-bold text-rose-600">{product.price}</p>
                )}

                {(product.rating || product.reviewCount) && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    {renderStars(product.rating)}
                    {product.rating && (
                      <span className="font-semibold text-slate-600">
                        {formatRating(product.rating)}
                      </span>
                    )}
                    {typeof product.reviewCount === "number" && (
                      <span>({product.reviewCount.toLocaleString()}件の評価)</span>
                    )}
                  </div>
                )}

                {product.matchedKeywords && product.matchedKeywords.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1 text-[11px] text-amber-700">
                    {product.matchedKeywords.map((keyword) => (
                      <span key={keyword} className="rounded-full bg-amber-100 px-2 py-0.5">
                        #{keyword}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-4">
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-amber-600"
                  >
                    Amazonで見る
                    <span aria-hidden>→</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!isLoading && products.length === 0 && keywords.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-amber-200 bg-white/60 p-6 text-sm text-slate-500">
          要約結果が表示されると、関連するAmazon商品をこちらに掲載します。
        </div>
      )}

      {!isLoading && products.length === 0 && keywords.length > 0 && (
        <div className="mt-4 space-y-4 rounded-xl border border-amber-100 bg-white/70 p-5 text-sm text-slate-600">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Amazon検索リンク
            </p>
            <p className="mt-1 text-sm">
              商品情報の取得に時間がかかる場合でも、以下のキーワードからすぐにAmazonの商品検索ページへ移動できます。
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fallbackSearches.map((item) => (
              <a
                key={item.keyword}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col justify-between rounded-lg border border-amber-200 bg-gradient-to-br from-white to-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 shadow-sm transition hover:border-amber-300 hover:shadow-md"
              >
                <span>「{item.keyword}」をAmazonで検索</span>
                <span className="mt-2 text-xs font-medium text-amber-500">新しいタブで開きます →</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>
      )}
    </aside>
  );
};

export type { AmazonProduct };
export default AmazonProductShowcase;
