// /app/components/AmazonProductShowcase.tsx
import Image from "next/image";
import { useMemo, useState } from "react";

type AmazonProduct = {
  asin: string;
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
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
}: AmazonProductShowcaseProps) => {
  const displayKeywords = useMemo(() => keywords.slice(0, 5), [keywords]);

  const shouldRender = isLoading || error || products.length > 0;

  if (!shouldRender) {
    return null;
  }

  return (
    <aside className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            美味しいおすすめ商品
          </p>
          <h2 className="text-xl font-bold text-slate-800">
            編集部が選んだとっておきリスト
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            登録済みの商品をシンプルなカードでご紹介します。
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
              className="flex animate-pulse flex-col rounded-xl border border-slate-100 bg-slate-50 p-4"
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
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-100 bg-white transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative h-48 w-full overflow-hidden bg-slate-50">
                <ProductImage product={product} />
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h3
                  className="text-sm font-semibold leading-snug text-slate-800"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {product.title || "商品名不明"}
                </h3>

                {product.description && (
                  <p className="mt-2 text-sm text-slate-600 line-clamp-3">{product.description}</p>
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    商品ページを見る
                    <span aria-hidden>→</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!isLoading && products.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          おすすめ商品が登録されると、こちらに表示されます。
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
