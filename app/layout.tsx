// /app/layout.tsx ver.5 - OGP画像URL修正版

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

// ビューポート設定を分離
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

// SEOとOGP最適化されたメタデータ
export const metadata: Metadata = {
  // 基本メタデータ
  title: 'AI記事要約.com - AIが読めないニュースも即座に要約',
  description: 'ChatGPTやGeminiがブロックされたニュースサイトも問題なし。有料記事も、AI出禁サイトも、URLを貼るだけで高精度要約。日経、東洋経済、NewsPicks対応。',
  
  // キーワード（一部の検索エンジンで参照）
  keywords: [
    'AI 要約',
    'ニュース 要約',
    'ChatGPT 読めない',
    'AI ブロック 回避',
    '有料記事 要約',
    '日経新聞 要約',
    'NewsPicks 要約',
    'AI出禁 対策',
    '記事 まとめ',
    'URL 要約'
  ],
  
  // Open Graph
  openGraph: {
    title: 'AI記事要約.com｜AIが読めないニュースも即座に要約',
    description: 'ChatGPTがブロックされた有料記事も要約可能。日経・東洋経済・NewsPicksなど主要メディア対応。URLを貼るだけの簡単操作。',
    url: 'https://youyaku.aizubrandhall-lp2.com',
    siteName: 'AI記事要約.com',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: 'https://youyaku.aizubrandhall-lp2.com/aiyouyaku.png',  // 絶対URLに変更
        width: 1200,
        height: 630,
        alt: 'AI記事要約.com - AIブロックを回避して記事を要約',
      }
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'AI記事要約.com｜AIが読めない記事も要約',
    description: 'ChatGPTやGeminiがアクセスできない有料記事・AI出禁サイトも簡単要約。URLを貼るだけ。',
    images: ['https://youyaku.aizubrandhall-lp2.com/aiyouyaku.png'],  // 絶対URLに変更
    creator: '@yourakuaizubrand',
  },
  
  // その他のメタタグ
  alternates: {
    canonical: 'https://youyaku.aizubrandhall-lp2.com',
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  verification: {
    // Google Search Console（必要に応じて追加）
    // google: 'verification-token',
  },
  
  // アプリケーション名
  applicationName: 'AI記事要約.com',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2EJ6JCB9N2"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2EJ6JCB9N2');
          `}
        </Script>
        {/* 追加のSEO最適化 */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* 構造化データ（JSON-LD） */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'AI記事要約.com',
              description: 'AIがブロックされたニュースサイトの記事も要約できるWebアプリケーション',
              url: 'https://youyaku.aizubrandhall-lp2.com',
              applicationCategory: 'UtilityApplication',
              operatingSystem: 'Any',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'JPY',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '329',
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
