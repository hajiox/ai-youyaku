// app/page.tsx

"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [longSummary, setLongSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [tone, setTone] = useState<"casual" | "formal">("casual"); // ★ このstateは不要になります

  // handleSummarize 関数に tone を引数として渡すように変更
  const handleSummarize = async (selectedTone: "casual" | "formal") => {
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
        fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=short&tone=${selectedTone}`), // 引数のselectedToneを使用
        fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=long&tone=${selectedTone}`),  // 引数のselectedToneを使用
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
    // setTone("casual"); // ★ tone stateがなくなったので不要
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-100 to-sky-100 text-slate-800 font-sans">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all duration-500 hover:scale-[1.01]">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-500">
          AI記事要約.com
        </h1>
        <div className="mb-6"> {/* ★ mb-6 に変更 */}
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="記事URLを入力してください"
            className="w-full text-lg p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow shadow-sm placeholder-slate-400"
            disabled={isLoading}
          />
        </div>

        {/* ★ トーン選択ボタンは削除 */}
        {/* <div className="mb-6 flex justify-center gap-3"> ... </div> */}

        {/* 要約ボタンを2つに分割 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => handleSummarize("casual")} // "casual" を指定
            className={`w-full px-6 py-3.5 bg-sky-500 text-white text-lg rounded-lg font-semibold hover:bg-sky-600 active:bg-sky-700 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 shadow-md hover:shadow-lg active:scale-95 ${
              isLoading ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? "処理中..." : "カジュアル要約"}
          </button>
          <button
            onClick={() => handleSummarize("formal")} // "formal" を指定
            className={`w-full px-6 py-3.5 bg-indigo-600 text-white text-lg rounded-lg font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-md hover:shadow-lg active:scale-95 ${
              isLoading ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? "処理中..." : "フォーマル要約"}
          </button>
        </div>
        {/* リセットボタンを単独で配置 */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-8 py-3 bg-slate-500 text-white text-lg rounded-lg font-semibold hover:bg-slate-600 active:bg-slate-700 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 shadow-md hover:shadow-lg active:scale-95"
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
              {/* ★ 表示するトーンが動的に決まるので、要約結果の見出しからトーン表示は削除しても良いかも */}
              <h2 className="text-2xl font-semibold text-blue-700">200文字要約</h2>
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
              {/* ★ 表示するトーンが動的に決まるので、要約結果の見出しからトーン表示は削除しても良いかも */}
              <h2 className="text-2xl font-semibold text-blue-700">1000文字要約</h2>
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
