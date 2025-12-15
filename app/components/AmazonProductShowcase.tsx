// /app/components/AmazonProductShowcase.tsx ver.4
import Image from "next/image";
import { useState } from "react";

type Product = {
  asin: string;
  title: string;
  url: string;
  imageUrl?: string;
  source: string;
};

type ProductShowcaseProps = {
  products: Product[];
  isLoading: boolean;
};

function ProductImage({ product }: { product: Product }) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(product.imageUrl);
  const [hasError, setHasError] = useState(false);

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
      onError={() => setHasError(true)}
      unoptimized
    />
  );
}

export default function AmazonProductShowcase({ products, isLoading }: ProductShowcaseProps) {
  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6 shadow-sm ring-1 ring-indigo-100/60">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          おすすめコンテンツ
        </p>
        <h2 className="text-xl font-bold text-slate-700">
          関連サービス
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          要約内容に関連するサービスをご紹介します
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="flex animate-pulse flex-col rounded-xl border border-white/70 bg-white/60 p-4 shadow-sm"
            >
              <div className="mb-3 aspect-square w-full rounded-lg bg-slate-200" />
              <div className="mb-2 h-3 rounded bg-slate-200" />
              <div className="h-3 w-3/4 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && products.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {products.map((product) => (
            <article
              key={product.asin}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/80 bg-white/80 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-48 w-full overflow-hidden bg-white">
                <ProductImage product={product} />
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-sm font-semibold leading-snug text-slate-700 line-clamp-2">
                  {product.title || "タイトル不明"}
                </h3>

                <div className="mt-auto pt-4">
                  
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow transition bg-indigo-500 hover:bg-indigo-600"
                  >
                    詳しく見る
                    <span aria-hidden>→</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
