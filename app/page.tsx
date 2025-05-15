"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Toast } from "@/components/ui/toast"

export default function Home() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [resultShort, setResultShort] = useState("")
  const [resultLong, setResultLong] = useState("")
  const [error, setError] = useState("")
  const [toast, setToast] = useState({ show: false, message: "" })
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchSummaries = async () => {
    // URLが空の場合はエラー
    if (!url) {
      setError("URLを入力してください")
      return
    }

    setLoading(true)
    setError("")
    setResultShort("")
    setResultLong("")

    try {
      // 2つのAPIリクエストを同時に実行
      const [shortResponse, longResponse] = await Promise.all([
        fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=short`),
        fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=long`),
      ])

      // レスポンスをJSON形式で取得
      const shortData = await shortResponse.json()
      const longData = await longResponse.json()

      // エラーチェック
      if (!shortResponse.ok || !longResponse.ok) {
        throw new Error(shortData.error || longData.error || "要約取得に失敗しました")
      }

      // 結果を設定
      setResultShort(shortData.result)
      setResultLong(longData.result)
    } catch (err) {
      console.error("Error fetching summaries:", err)
      setError("要約取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    if (text) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setToast({ show: true, message: "コピーしました" })
          setTimeout(() => setToast({ show: false, message: "" }), 3000)
        })
        .catch((err) => {
          console.error("クリップボードへのコピーに失敗しました:", err)
        })
    }
  }

  // 仮のおすすめ商品データ
  const recommendedProducts = [
    { id: 1, title: "AI入門書籍", price: "2,980円", imageUrl: "/open-book-library.png" },
    { id: 2, title: "ノートパソコン", price: "89,800円", imageUrl: "/modern-laptop-workspace.png" },
    { id: 3, title: "ワイヤレスイヤホン", price: "15,800円", imageUrl: "/wireless-earphones.png" },
  ]

  return (
    <main className="flex min-h-screen flex-col items-center justify-start py-10 px-4">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">AI記事要約.com</h1>

        <div className="mb-6">
          <Input
            ref={inputRef}
            type="text"
            placeholder="記事URLを入力"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mb-4"
          />

          <div className="flex justify-center">
            <Button onClick={fetchSummaries} disabled={loading} className="px-8">
              {loading ? <Spinner className="mr-2" /> : null}
              要約する
            </Button>
          </div>
        </div>

        {error && <div className="text-red-500 text-center my-6">{error}</div>}

        {resultShort && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-semibold">200文字要約:</h2>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(resultShort)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </Button>
            </div>
            <p className="whitespace-pre-wrap">{resultShort}</p>
          </div>
        )}

        {resultLong && (
          <div className="bg-gray-50 p-4 rounded-lg mb-8">
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-semibold">1000文字要約:</h2>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(resultLong)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </Button>
            </div>
            <p className="whitespace-pre-wrap">{resultLong}</p>
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">おすすめ商品</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recommendedProducts.map((product) => (
              <div key={product.id} className="border rounded-lg p-4 flex flex-col items-center">
                <img
                  src={product.imageUrl || "/placeholder.svg"}
                  alt={product.title}
                  className="w-24 h-24 object-cover mb-2"
                />
                <h3 className="font-medium text-center">{product.title}</h3>
                <p className="text-gray-600">{product.price}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast.show && <Toast message={toast.message} />}
    </main>
  )
}
