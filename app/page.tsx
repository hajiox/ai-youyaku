"use client"

import { useState, type FormEvent } from "react"

export default function Home() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [summaries, setSummaries] = useState<{
    shortSummary: string
    longSummary: string
  } | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      setError("URLを入力してください")
      return
    }

    setLoading(true)
    setError("")
    setSummaries(null)

    try {
      // 実際のAPIエンドポイントを呼び出す（この実装では省略）
      // const response = await fetch("/api/summary", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ url }),
      // })

      // APIレスポンスをシミュレート
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // if (!response.ok) throw new Error("要約の取得に失敗しました")
      // const data = await response.json()

      // シミュレートしたレスポンスデータ
      const data = {
        shortSummary:
          "これは200文字の要約です。実際のAPIを実装すると、ここに本物の要約が表示されます。この要約は記事の主要なポイントを簡潔にまとめたものになります。短い要約は、記事の概要を素早く把握したい場合や、SNSでシェアする際に便利です。",
        longSummary:
          "これは1000文字の要約です。実際のAPIを実装すると、ここに本物の要約が表示されます。長い要約は、記事の詳細な内容を含み、より多くの情報を提供します。記事の主要な論点、重要な事実、結論などが含まれます。長い要約は、記事の詳細を理解したい場合や、元の記事を読む時間がない場合に役立ちます。この要約は、元の記事の内容を忠実に反映しつつも、冗長な部分を省いて読みやすくしています。要約プロセスでは、重要でない情報は除外され、記事の本質的な部分に焦点が当てられます。これにより、読者は短時間で記事の主要なポイントを理解することができます。長い要約は短い要約よりも詳細ですが、それでも元の記事よりは簡潔です。これは、情報の密度を高めながらも、読みやすさを維持するためです。AI技術を使用した要約は、大量のテキストから重要な情報を抽出し、構造化された形式で提示することができます。これは、情報過多の時代において、効率的に知識を獲得するための強力なツールとなります。",
      }

      setSummaries(data)
    } catch (err) {
      console.error("Error:", err)
      setError("要約取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("コピーしました")
      })
      .catch(() => {
        alert("コピーに失敗しました")
      })
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center my-8">AI記事要約.com</h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full p-3 border border-gray-300 rounded-md mb-4"
            required
          />

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md disabled:opacity-50"
            >
              {loading ? "要約中..." : "要約する"}
            </button>
          </div>
        </form>

        {error && <div className="text-red-500 text-center mb-6">{error}</div>}

        {loading && (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {summaries && (
          <div className="space-y-8">
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-lg font-semibold">200文字要約</h2>
                <button
                  onClick={() => copyToClipboard(summaries.shortSummary)}
                  className="text-gray-600 hover:text-gray-900"
                  aria-label="コピー"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="whitespace-pre-wrap">{summaries.shortSummary}</p>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-lg font-semibold">1000文字要約</h2>
                <button
                  onClick={() => copyToClipboard(summaries.longSummary)}
                  className="text-gray-600 hover:text-gray-900"
                  aria-label="コピー"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="whitespace-pre-wrap">{summaries.longSummary}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
