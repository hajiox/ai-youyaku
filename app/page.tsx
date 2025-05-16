// app/page.tsx

"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [longSummary, setLongSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<"casual" | "formal">("casual"); // トーンの状態 (デフォルトはカジュアル)

  const handleSummarize = async () => {
    if (!url) {
      alert("URLを入力してください");
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setShortSummary("");
    setLongSummary("");

    try {
      const [shortRes, longRes] = await Promise.all([
        fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=short&tone=${tone}`), // toneパラメータを追加
        fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=long&tone=${tone}`),  // toneパラメータを追加
      ]);

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
      setShortSummary("");
      setLongSummary("");
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => {
        alert("コピーしました！");
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
    setIsLoading(false);
    setTone("casual"); // リセット時にトーンもデフォルトに戻す
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-100 to-sky-100 text-slate-800 font-sans">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all duration-500 hover:scale-[1.01]">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-500">
          AI記事要約.com
        </h1>
        <div className="mb-6">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="記事URLを入力してください"
            className="w-full text-lg p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow shadow-sm placeholder-slate-400"
            disabled={isLoading}
          />
        </div>

        {/* トーン選択ボタン */}
        <div className="mb-6 flex justify-center gap-3">
          <button
            onClick={() => setTone("casual")}
            className={`px-5 py-2.5 rounded-lg text-md font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2
              ${tone === "casual"
                ? "bg-sky-500 text-white shadow-md ring-sky-400"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300 ring-slate-300"
              }`}
            disabled={isLoading}
          >
            カジュアル
          </button>
          <button
            onClick={() => setTone("formal")}
            className={`px-5 py-2.5 rounded-lg text-md font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2
              ${tone === "formal"
                ? "bg-indigo-600 text-white shadow-md ring-indigo-500"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300 ring-slate-300"
              }`}
            disabled={isLoading}
          >
            フォーマル
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <button
            onClick={handleSummarize}
            className={`w-full sm:flex-1 px-6 py-3.5 bg-blue-600 text-white text-lg rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md hover:shadow-lg active:scale-95 ${
              isLoading ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? "要約中..." : "要約する"}
          </button>
          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-500 text-white text-lg rounded-lg font-semibold hover:bg-slate-600 active:bg-slate-700 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 shadow-md hover:shadow-lg active:scale-95"
            disabled={isLoading && !url && !shortSummary && !longSummary && !error}
          >
            リセット
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg shadow-sm">
            <p className="font-semibold text-lg">エラーが発生しました:</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {shortSummary && (
          <div className="mt-8 p-5 border border-slate-200 rounded-lg bg-slate-50 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-2xl font-semibold text-blue-700">200文字要約 ({tone === 'casual' ? 'カジュアル' : 'フォーマル'})</h2>
              <button
                onClick={() => copyText(shortSummary)}
                className="text-sm text-white bg-slate-700 px-4 py-2 rounded-md hover:bg-slate-800 active:bg-slate-900 transition-colors active:scale-95 shadow"
              >
                コピー
              </button>
            </div>
            <p className="mb-2 text-slate-700 text-base leading-relaxed whitespace-pre-wrap break-words">{shortSummary}</p>
          </div>
        )}

        {longSummary && (
          <div className="mt-8 p-5 border border-slate-200 rounded-lg bg-slate-50 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-2xl font-semibold text-blue-700">1000文字要約 ({tone === 'casual' ? 'カジュアル' : 'フォーマル'})</h2>
              <button
                onClick={() => copyText(longSummary)}
                className="text-sm text-white bg-slate-700 px-4 py-2 rounded-md hover:bg-slate-800 active:bg-slate-900 transition-colors active:scale-95 shadow"
              >
                コピー
              </button>
            </div>
            <p className="mb-2 text-slate-700 text-base leading-relaxed whitespace-pre-wrap break-words">{longSummary}</p>
          </div>
        )}
      </div>
      <footer className="text-center mt-12 text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} AI記事要約.com. All rights reserved.</p>
      </footer>
    </main>
  );
}
