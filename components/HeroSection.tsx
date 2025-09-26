// components/HeroSection.tsx ver.1 - SEO最適化版

import React from 'react'

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* メインキャッチコピー */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
          AIが読めないニュースも
          <span className="text-blue-600 block md:inline">即座に要約</span>
        </h1>
        
        {/* サブキャッチコピー */}
        <p className="text-lg md:text-xl text-gray-700 text-center mb-8">
          ChatGPT・Geminiがブロックされた記事もOK！
          <br className="md:hidden" />
          有料記事も簡単要約
        </p>
        
        {/* 特徴バッジ */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            ✓ AI出禁サイト対応
          </span>
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            ✓ 有料記事OK
          </span>
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            ✓ 日経・東洋経済対応
          </span>
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            ✓ 完全無料
          </span>
        </div>
        
        {/* 対応サイトロゴ（SEO対策） */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600 mb-3">主要メディア対応</p>
          <div className="flex flex-wrap justify-center gap-4 text-gray-500">
            <span>日経新聞</span>
            <span>•</span>
            <span>東洋経済</span>
            <span>•</span>
            <span>NewsPicks</span>
            <span>•</span>
            <span>ダイヤモンド</span>
            <span>•</span>
            <span>その他多数</span>
          </div>
        </div>
        
        {/* 使い方説明 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            なぜAI記事要約.comが必要？
          </h2>
          <div className="space-y-2 text-gray-700">
            <p className="flex items-start">
              <span className="text-red-500 mr-2">×</span>
              <span>ChatGPTに「このニュース要約して」と頼んでも「アクセスできません」と断られる</span>
            </p>
            <p className="flex items-start">
              <span className="text-red-500 mr-2">×</span>
              <span>有料会員なのにAIツールで記事を処理できない</span>
            </p>
            <p className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="font-bold">AI記事要約.comならすべて解決！URLを貼るだけで要約完了</span>
            </p>
          </div>
        </div>
        
        {/* SEO用追加コンテンツ */}
        <div className="text-center text-sm text-gray-600">
          <p>
            ※ 本サービスは記事の著作権を尊重し、個人利用の範囲で要約を提供します
          </p>
        </div>
      </div>
    </section>
  )
}
