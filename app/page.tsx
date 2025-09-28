// app/page.tsx ver.2 - レイアウト修正版

'use client'

import { useState } from 'react'
import { User } from 'lucide-react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSummarize = async (mode: 'short' | 'long', tone: 'casual' | 'formal' | 'custom') => {
    if (!url) {
      alert('URLを入力してください')
      return
    }
    
    setIsLoading(true)
    // ここに要約処理を実装
    console.log('Summarizing:', url, mode, tone)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 認証状態（必要に応じて） */}
      {/* <div className="auth-status">
        <User className="auth-icon" />
        <span className="text-sm">佐藤正彦</span>
        <button className="logout-button">ログアウト</button>
      </div> */}

      {/* メインコンテンツ */}
      <main className="main-container">
        <div className="card-container">
          {/* タイトル */}
          <h1 className="site-title">AI記事要約.com</h1>
          <p className="site-subtitle">
            記事URLをペーストして、お好みのスタイルでAIが要約します。
          </p>

          {/* URL入力フィールド */}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="記事URLを入力"
            className="url-input"
            disabled={isLoading}
          />

          {/* 口調選択ボタン */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2 text-center">
              自分の口調を登録・編集する
            </p>
          </div>

          {/* アクションボタン */}
          <div className="button-group">
            <button
              onClick={() => handleSummarize('short', 'casual')}
              disabled={isLoading}
              className="button-primary button-casual"
            >
              カジュアル
            </button>
            <button
              onClick={() => handleSummarize('short', 'formal')}
              disabled={isLoading}
              className="button-primary button-formal"
            >
              フォーマル
            </button>
            <button
              onClick={() => handleSummarize('short', 'custom')}
              disabled={isLoading}
              className="button-primary button-custom"
            >
              自分の口調
            </button>
          </div>

          <div className="flex justify-center mt-2">
            <button
              onClick={() => setUrl('')}
              disabled={isLoading}
              className="button-primary button-reset"
              style={{ flex: 'none', minWidth: '100px' }}
            >
              リセット
            </button>
          </div>

          {/* ローディング表示 */}
          {isLoading && (
            <div className="mt-4 text-center text-gray-600">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2">要約を生成中...</p>
            </div>
          )}
        </div>
      </main>

      {/* フッター */}
      <footer className="site-footer">
        <div className="footer-content">
          <a 
            href="#" 
            className="footer-link"
          >
            ご連絡はこちら
          </a>
          <p className="footer-text">
            当サイトは、Amazon.co.jpを宣伝しリンクすることによってサイトが紹介料を獲得できる手段を提供することを目的に設定されたアフィリエイトプログラムである、Amazonアソシエイト・プログラムの参加者です。
          </p>
          <p className="footer-text">
            © 2025 AI記事要約.com
          </p>
        </div>
      </footer>
    </div>
  )
}
