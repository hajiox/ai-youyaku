// app/page.tsx

"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [longSummary, setLongSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false); // ローディング状態
  const [error, setError] = useState<string | null>(null); // エラーメッセージ

  const handleSummarize = async () => {
    if (!url) {
      alert("URLを入力してください");
      return;
    }
    if (isLoading) return; // ローディング中は処理しない

    setIsLoading(true);
    setError(null); // 前のエラーをクリア
    setShortSummary(""); // 前回のショート要約をクリア
    setLongSummary(""); // 前回のロング要約をクリア

    try {
      // Promise.allで並行してAPIを呼び出す
      const [shortRes, longRes] = await Promise.all([
        fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=short`),
        fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=long`),
      ]);

      // エラーハンドリングを各レスポンスで行う
      if (!shortRes.ok) {
        const errorData = await shortRes.json().catch(() => ({ result: "200文字要約の取得に失敗しました" }));
        throw new Error(errorData.result || `200文字要約エラー: ${shortRes.status}`);
      }
      if (!longRes.ok) {
        const errorData = await longRes.json().catch(() => ({ result: "1000文字要約の取得に失敗しました" }));
        throw new Error(errorData.result || `1000文字要約エラー: ${longRes.status}`);
      }

      const shortData = await shortRes.json();
      const longData = await longRes.json();

      setShortSummary(shortData.result || "200文字要約の取得に失敗しました");
      setLongSummary(longData.result || "1000文字要約の取得に失敗しました");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "要約中に不明なエラーが発生しました");
      // エラー時は要約結果を空にする（既にクリアされているが念のため）
      setShortSummary("");
      setLongSummary("");
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = (text: string) => {
    if (!text) return; // 空のテキストはコピーしない
    navigator.clipboard.writeText(text)
      .then(() => {
        alert("コピーしました！"); // ユーザーにフィードバック
      })
      .catch(err => {
        console.error("コピーに失敗しました: ", err);
        alert("コピーに失敗しました。");
      });
  };

  const handleReset = () => {
    setUrl("");
    setShortSummary("");
    setLongSummary("");
    setError(null);
    setIsLoading(false); // ローディング中だった場合もリセット
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100 text-gray-800">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">AI記事要約.com</h1>
        <div className="mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="記事URLを入力"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            disabled={isLoading} // ローディング中は無効化
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <button
            onClick={handleSummarize}
            className={`w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isLoading} // ローディング中は無効化
          >
            {isLoading ? "要約中..." : "要約する"}
          </button>
          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-6 py-3 bg-gray-500 text-white rounded-md font-semibold hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            disabled={isLoading && !url && !shortSummary && !longSummary && !error} // 完全に初期状態なら無効でも良いかも
          >
            リセット
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p className="font-semibold">エラー:</p>
            <p>{error}</p>
          </div>
        )}

        {shortSummary && (
          <div className="mt-6 p-4 border border-gray-300 rounded-md bg-gray-50 shadow">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-blue-700">200文字要約</h2>
              <button
                onClick={() => copyText(shortSummary)}
                className="text-sm text-white bg-black px-3 py-1 rounded-md hover:bg-gray-800 transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="mb-2 text-gray-700 whitespace-pre-wrap break-words">{shortSummary}</p>
          </div>
        )}

        {longSummary && (
          <div className="mt-6 p-4 border border-gray-300 rounded-md bg-gray-50 shadow">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-blue-700">1000文字要約</h2>
              <button
                onClick={() => copyText(longSummary)}
                className="text-sm text-white bg-black px-3 py-1 rounded-md hover:bg-gray-800 transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="mb-2 text-gray-700 whitespace-pre-wrap break-words">{longSummary}</p>
          </div>
        )}
      </div>
    </main>
  );
}
