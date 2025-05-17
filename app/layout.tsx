// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css'; // あなたのグローバルCSSファイル
import Providers from './providers'; // ★★★ これを追加 ★★★

// ★★★ メタデータ定義ここから ★★★
const siteName = "AI記事要約.com";
const siteDescription = "記事URLをペーストするだけで、AIがカジュアルまたはフォーマルなスタイルで瞬時に要約。200字と1000字の2パターンで情報収集を効率化します。";
const siteUrl = "https://youyaku.aizubrandhall-lp2.com";
const ogImageUrl = `${siteUrl}/aiyouyaku.png`;

export const metadata: Metadata = {
  title: {
    default: `${siteName} - URLだけで簡単AI記事要約`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: `${siteName} - AIが記事を瞬時に要約`,
    description: siteDescription,
    url: siteUrl,
    siteName: siteName,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `${siteName} OGP画像`,
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} - AIが記事を瞬時に要約`,
    description: siteDescription,
    images: [ogImageUrl],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};
// ★★★ メタデータ定義ここまで ★★★

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <Providers> {/* ★★★ ここでchildrenをラップします ★★★ */}
          {children}
        </Providers>
      </body>
    </html>
  )
}
