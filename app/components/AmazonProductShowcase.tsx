// /app/components/AmazonProductShowcase.tsx ver.6 fixed
"use client";

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

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="flex animate-pulse flex-col rounded-xl border border-white/70 bg-white p-4 shadow-sm"
            >
              <div className="relative mb-3 h-40 w-full overflow-hidden rounded-lg bg-slate-100" />
              <div className="h-4 w-3/4 rounded bg-slate-100" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {products.map((product) => (
            <a
              key={product.asin}
              href={product.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group flex flex-col overflow-hidden rounded-xl border border-white/70 bg-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
            >
              <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
                <ProductImage product={product} />
              </div>
              
              <div className="flex flex-col gap-3 p-4">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-700 group-hover:text-indigo-600">
                  {product.title}
                </h3>
                
                <button className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                  <span>詳しく見る</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
