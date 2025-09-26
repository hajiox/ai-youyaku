// components/BookmarkletButton.tsx ver.1

'use client'

import React, { useState } from 'react'

export default function BookmarkletButton() {
  const [showInstructions, setShowInstructions] = useState(false)
  
  // ブックマークレットのコード
  const bookmarkletCode = `javascript:(function(){window.open('https://youyaku.aizubrandhall-lp2.com?url='+encodeURIComponent(location.href),'_blank')})();`
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', bookmarkletCode)
    e.dataTransfer.effectAllowed = 'copy'
  }
  
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        📎 ワンクリック要約ボタンを追加
      </h2>
      
      <p className="text-gray-700 mb-4">
        ブックマークバーに「要約ボタン」を追加すれば、どんな記事も1クリックで要約できます
      </p>
      
      {/* ドラッグ可能なボタン */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
        <a
          href={bookmarkletCode}
          onDragStart={handleDragStart}
          onClick={(e) => {
            e.preventDefault()
            setShowInstructions(!showInstructions)
          }}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all cursor-move"
          draggable
        >
          ⚡ AI要約ボタン
        </a>
        <span className="text-sm text-gray-600">
          ← このボタンをブックマークバーにドラッグ
        </span>
      </div>
      
      {/* 使い方説明 */}
      {showInstructions && (
        <div className="bg-white rounded-lg p-4 mt-4 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-2">設定方法</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>上の「AI要約ボタン」をブックマークバーにドラッグ&ドロップ</li>
            <li>要約したい記事ページを開く</li>
            <li>ブックマークバーの「AI要約ボタン」をクリック</li>
            <li>自動的に要約ページが開きます</li>
          </ol>
          
          <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
            <p className="font-bold text-yellow-800">💡 ヒント</p>
            <p className="text-yellow-700">
              有料記事の場合は、ログイン済みの状態でボタンをクリックしてください
            </p>
          </div>
        </div>
      )}
      
      {/* 対応ブラウザ */}
      <div className="text-xs text-gray-600 mt-4">
        対応ブラウザ: Chrome, Edge, Firefox, Safari
      </div>
    </div>
  )
}
