// app/page.tsx

"use client";

import { useState, useEffect } from "react"; // useEffect をインポート
// import { Metadata } from 'next'; // layout.tsx で管理

// メタデータ定義は app/layout.tsx に移動

export default function Home() {
  const [url, setUrl] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [longSummary, setLongSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedInfo, setProcessedInfo] = useState<{truncated: boolean, originalLength: number, processedLength: number} | null>(null);
  const [showContactModal, setShowContactModal] = useState(false); // ★連絡フォームモーダルの表示状態

  const handleSummarize = async (selectedTone: "casual" | "formal") => {
    // ... (前回と同じ)
    if (!url) {
      alert("URLを入力してください");
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setShortSummary("");
    setLongSummary("");
    setProcessedInfo(null);

    try {
      const [shortRes, longRes] = await Promise.all([
        fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=short&tone=${selectedTone}`),
        fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=long&tone=${selectedTone}`),
      ]);

      let shortError = null;
      let longError = null;
      let shortData: any = {};
      let longData: any = {};

      if (!shortRes.ok) {
        shortError = `200文字要約エラー: ${shortRes.status}`;
        try { shortData = await shortRes.json(); if(shortData.error) shortError = shortData.error; } catch {}
      } else {
        shortData = await shortRes.json();
      }

      if (!longRes.ok) {
        longError = `1000文字要約エラー: ${longRes.status}`;
        try { longData = await longRes.json(); if(longData.error) longError = longData.error; } catch {}
      } else {
        longData = await longRes.json();
      }

      if (shortError || longError) {
        throw new Error(shortError || longError || "要約中にエラーが発生しました");
      }

      setShortSummary(shortData.result || "200文字要約の取得に失敗しました");
      setLongSummary(longData.result || "1000文字要約の取得に失敗しました");

      if (shortData.truncated !== undefined) {
        setProcessedInfo({
          truncated: shortData.truncated,
          originalLength: shortData.originalLength,
          processedLength: shortData.processedLength,
        });
      } else if (longData.truncated !== undefined) {
         setProcessedInfo({
          truncated: longData.truncated,
          originalLength: longData.originalLength,
          processedLength: longData.processedLength,
        });
      }


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
    // ... (前回と同じ)
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
    // ... (前回と同じ)
    setUrl("");
    setShortSummary("");
    setLongSummary("");
    setError(null);
    setIsLoading(false);
    setProcessedInfo(null);
  };

  // ★ モーダル表示時に背景スクロールを禁止する (任意)
  useEffect(() => {
    if (showContactModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // クリーンアップ関数
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showContactModal]);


  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 text-slate-700 font-sans">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-lg">
        <h1 className="text-3xl font-semibold mb-2 text-center text-blue-600">
          AI記事要約.com
        </h1>
        <p className="text-sm text-slate-500 mb-6 text-center">
          記事URLをペーストして、お好みのスタイルでAIが要約します。
        </p>

        <div className="mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="記事URLを入力"
            className="w-full text-base p-3 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => handleSummarize("casual")}
            className={`w-full px-4 py-2.5 bg-sky-500 text-white text-base rounded-md font-medium hover:bg-sky-600 active:bg-sky-700 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400 focus:ring-offset-1 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? "処理中..." : "カジュアル"}
          </button>
          <button
            onClick={() => handleSummarize("formal")}
            className={`w-full px-4 py-2.5 bg-indigo-500 text-white text-base rounded-md font-medium hover:bg-indigo-600 active:bg-indigo-700 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:ring-offset-1 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? "処理中..." : "フォーマル"}
          </button>
        </div>
        <div className="flex justify-center mb-6">
          <button
            onClick={handleReset}
            className="w-auto px-6 py-2 bg-slate-400 text-white text-base rounded-md font-medium hover:bg-slate-500 active:bg-slate-600 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-300 focus:ring-offset-1"
            disabled={isLoading && !url && !shortSummary && !longSummary && !error}
          >
            リセット
          </button>
        </div>


        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-600 rounded-md text-sm">
            <p>{error}</p>
          </div>
        )}

        {processedInfo && processedInfo.truncated && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 text-yellow-600 rounded-md text-sm">
            <p>ℹ️ 記事が長いため、先頭{processedInfo.processedLength.toLocaleString()}文字で要約しました。(原文: {processedInfo.originalLength.toLocaleString()}文字)</p>
          </div>
        )}

        {/* ... (要約結果表示は前回と同じ) ... */}
        {shortSummary && (
          <div className="mt-6 p-4 border border-slate-200 rounded-md bg-white">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-slate-700">200字要約</h2>
              <button
                onClick={() => copyText(shortSummary)}
                className="text-xs text-white bg-slate-500 px-3 py-1 rounded hover:bg-slate-600 transition-colors"
              >
                コピー
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{shortSummary}</p>
          </div>
        )}

        {longSummary && (
          <div className="mt-4 p-4 border border-slate-200 rounded-md bg-white">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-slate-700">1000字要約</h2>
              <button
                onClick={() => copyText(longSummary)}
                className="text-xs text-white bg-slate-500 px-3 py-1 rounded hover:bg-slate-600 transition-colors"
              >
                コピー
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{longSummary}</p>
          </div>
        )}
      </div>

      {/* ★ フッター */}
      <footer className="text-center mt-8 text-xs text-slate-400">
        <p className="mb-1">
          <button
            onClick={() => setShowContactModal(true)} // ★ モーダル表示ボタン
            className="hover:underline focus:outline-none"
          >
            ご連絡はこちら
          </button>
        </p>
        <p className="mb-1 text-[10px] leading-tight px-2"> {/* 文字をさらに小さく、行間を詰める */}
          当サイトは、Amazon.co.jpを宣伝しリンクすることによってサイトが紹介料を獲得できる手段を提供することを目的に設定されたアフィリエイトプログラムである、Amazonアソシエイト・プログラムの参加者です。
        </p>
        <p className="mt-1">© {new Date().getFullYear()} AI記事要約.com</p>
      </footer>

      {/* ★ 連絡先モーダル (超シンプル版: mailtoリンク) */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-700">ご連絡</h2>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
              >
                × {/* HTMLエンティティでバツ印 */}
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              ご意見、ご感想、その他お問い合わせは、以下のメールアドレス宛にお願いいたします。
            </p>
            <a
              href="mailto:ts@ai.aizu-tv.com?subject=AI記事要約.comへのお問い合わせ" // ★ 送信先メールアドレスと件名
              className="block w-full text-center px-4 py-2.5 bg-blue-500 text-white text-base rounded-md font-medium hover:bg-blue-600 transition-colors"
              onClick={() => setShowContactModal(false)} // メール送信後（またはメーラー起動後）にモーダルを閉じる
            >
              メールで問い合わせる
            </a>
            <button
              onClick={() => setShowContactModal(false)}
              className="mt-3 block w-full text-center px-4 py-2.5 bg-slate-200 text-slate-700 text-base rounded-md font-medium hover:bg-slate-300 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
