// app/page.tsx

"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [longSummary, setLongSummary] = useState("");

  const handleSummarize = async () => {
    if (!url) return alert("URLを入力してください");

    try {
      const shortRes = await fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=short`);
      const longRes = await fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=long`);
      const shortData = await shortRes.json();
      const longData = await longRes.json();

      setShortSummary(shortData.result || "要約に失敗しました");
      setLongSummary(longData.result || "要約に失敗しました");
    } catch (err) {
      console.error(err);
      alert("要約中にエラーが発生しました");
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">AI記事要約.com</h1>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="記事URLを入力"
        className="w-full max-w-xl p-2 border rounded mb-4"
      />
      <button
        onClick={handleSummarize}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        要約する
      </button>

      {shortSummary && (
        <div className="mt-6 p-4 border rounded w-full max-w-xl">
          <h2 className="font-bold mb-2">200文字要約</h2>
          <p className="mb-2">{shortSummary}</p>
          <button
            onClick={() => copyText(shortSummary)}
            className="text-sm text-white bg-black px-2 py-1 rounded"
          >
            Copy
          </button>
        </div>
      )}

      {longSummary && (
        <div className="mt-6 p-4 border rounded w-full max-w-xl">
          <h2 className="font-bold mb-2">1000文字要約</h2>
          <p className="mb-2">{longSummary}</p>
          <button
            onClick={() => copyText(longSummary)}
            className="text-sm text-white bg-black px-2 py-1 rounded"
          >
            Copy
          </button>
        </div>
      )}
    </main>
  );
}
