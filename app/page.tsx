"use client"

import { useState, type FormEvent } from "react"
import CopyButton from "./components/CopyButton"

export default function Home() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [shortSummary, setShortSummary] = useState("")
  const [longSummary, setLongSummary] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!url) {
      setError("URLを入力してください")
      return
    }

    setLoading(true)
    setError("")
    setShortSummary("")
    setLongSummary("")

    try {
      // 短い要約と長い要約を並行して取得
      const [shortResponse, longResponse] = await Promise.all([
        fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=short`),
        fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=long`),
      ])

      const shortData = await shortResponse.json()
      const longData = await longResponse.json()

      if (!shortResponse.ok || !longResponse.ok) {
        throw new Error(shortData.error || longData.error || "要約の取得に失敗しました")
      }

      setShortSummary(shortData.result)
      setLongSummary(longData.result)
    } catch (err) {
      console.error("Error:", err)
      setError(err instanceof Error ? err.message : "要約の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <div className="max-w-3xl w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-center my-8">AI記事要約.com</h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col md:flex-row gap-2 mb-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="記事のURLを入力"
              className="flex-1 p-2 border border-gray-300 rounded"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? "要約中..." : "要約する"}
            </button>
          </div>

          {error && <p className="text-red-500 text-center">{error}</p>}
        </form>

        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">200文字要約</h2>
              {shortSummary && <CopyButton text={shortSummary} />}
            </div>
            <div className="bg-gray-50 p-3 rounded min-h-[100px]">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{shortSummary}</p>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">1000文字要約</h2>
              {longSummary && <CopyButton text={longSummary} />}
            </div>
            <div className="bg-gray-50 p-3 rounded min-h-[200px]">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{longSummary}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
