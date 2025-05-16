// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css'; // あなたのグローバルCSSファイル

// ★★★ メタデータ定義ここから ★★★
const siteName = "AI記事要約.com";
const siteDescription = "記事URLをペーストするだけで、AIがカジュアルまたはフォーマルなスタイルで瞬時に要約。200字と1000字の2パターンで情報収集を効率化します。";
// ↓↓↓ あなたの実際のドメインと画像パスに合わせて必ず修正してください ↓↓↓
const siteUrl = "https://youyaku.aizubrandhall-lp2.com"; // 例: あなたのドメイン
const ogImageUrl = `${siteUrl}/aiyouyaku.png`; // public/aiyouyaku.png を置いた場合

export const metadata: Metadata = {
  // 検索エンジン向けの基本情報
  title: {
    default: `${siteName} - URLだけで簡単AI記事要約`, // デフォルトのタイトル
    template: `%s | ${siteName}`, // 子ページでtitleが設定された場合のテンプレート
  },
  description: siteDescription,
  alternates: {
    canonical: siteUrl,
  },
  // OGP (Open Graph Protocol) 設定
  openGraph: {
    title: `${siteName} - AIが記事を瞬時に要約`,
    description: siteDescription,
    url: siteUrl,
    siteName: siteName,
    images: [
      {
        url: ogImageUrl,
        width: 1200, // 画像の実際の幅に合わせて調整推奨
        height: 630,    // 画像の実際の高さに合わせて調整推奨
        alt: `${siteName} OGP画像`,
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  // Twitterカード設定
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} - AIが記事を瞬時に要約`,
    description: siteDescription,
    images: [ogImageUrl],
    // site: '@YourTwitterHandle',
    // creator: '@YourTwitterHandle',
  },
  // ファビコン
  icons: {
    icon: '/favicon.ico', // publicフォルダにfavicon.icoを配置
    apple: '/apple-touch-icon.png', // publicフォルダにapple-touch-icon.pngを配置
  },
  // robots: 'index, follow', // 必要に応じて
};
// ★★★ メタデータ定義ここまで ★★★

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      {/* Next.jsが<head>タグを自動的に管理し、上記のmetadataオブジェクトの内容を挿入します */}
      <body>
        {children} {/* ← このchildrenがページコンポーネントの内容を描画します */}
      </body>
    </html>
  )
}
