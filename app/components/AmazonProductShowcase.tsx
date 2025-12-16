// /app/components/AmazonProductShowcase.tsx ver.8 - サイドバー用縦並び対応版
"use client";

import Image from "next/image";
import { useState } from "react";

type Product = {
  asin: string;
  title: string;
  url: string;
  imageUrl?: string;
  source?: string;
};

type AmazonProductShowcaseProps = {
  keywords: string[];
  products: Product[];
  isLoading: boolean;
  error: string | null;
  partnerTag?: string;
};

const ProductImage = ({ src, alt }: { src?: string; alt: string }) => {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
        <span className="text-xs">No Image</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover transition-transform duration-300 group-hover:scale-105"
      onError={() => setImgError(true)}
      unoptimized
    />
  );
};

export default function AmazonProductShowcase({
  products,
  isLoading,
}: AmazonProductShowcaseProps) {
  
  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <div className="w-full h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-indigo-600 rounded-full"></div>
        <h2 className="text-lg font-bold text-slate-800">おすすめコンテンツ</h2>
      </div>

      {isLoading ? (
        // ローディングスケルトン: スマホ2列 / PC(サイドバー)1列
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-3 h-64 animate-pulse">
              <div className="w-full h-32 bg-slate-200 rounded mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        // 商品一覧: スマホ2列 / PC(サイドバー)1列
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          {products.map((product) => (
            <a
              key={product.asin}
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
            >
              {/* 画像エリア */}
              <div className="relative w-full aspect-[1.91/1] overflow-hidden bg-slate-100">
                <ProductImage src={product.imageUrl} alt={product.title} />
              </div>

              {/* テキストエリア */}
              <div className="p-3 flex flex-col flex-grow">
                <h3 className="font-bold text-slate-700 text-sm line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                  {product.title}
                </h3>
                
                <div className="mt-auto pt-2">
                  <span className="text-xs font-medium text-indigo-500 flex items-center gap-1 group-hover:underline">
                    詳しく見る 
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
