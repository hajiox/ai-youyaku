"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export default function Home() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchSummary = async (mode: "short" | "long") => {
    if (!url) {
      setError(true)
      setResult("")
      return
    }

    setLoading(true)
    setError(false)
    setResult("")

    try {
      const response = await fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=${mode}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "エラーが発生しました")
      }

      setResult(data.result)
    } catch (err) {
      console.error("Error fetching summary:", err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard
        .writeText(result)
        .then(() => {
          alert("クリップボードにコピーしました")
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

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => fetchSummary("short")} disabled={loading} className="flex-1">
              200文字（X用）要約
            </Button>
            <Button onClick={() => fetchSummary("long")} disabled={loading} className="flex-1">
              1000文字（ブログ用）要約
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center my-6">
            <Spinner />
          </div>
        )}

        {result && !error && (
          <div className="bg-gray-50 p-4 rounded-lg mb-8">
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-semibold">要約結果:</h2>
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="ml-2">
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
            <p className="whitespace-pre-wrap">{result}</p>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-center my-6">要約に失敗しました。URL とモードを確認してください</div>
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
    </main>
  )
}
