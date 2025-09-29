// app/page.tsx ver.2

"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import AmazonProductShowcase, {
  AmazonProduct as AmazonProductType,
} from "./components/AmazonProductShowcase";
import ToneSampleModal from "./components/ToneSampleModal";

const FREE_USER_TONE_SAMPLE_MAX_LENGTH = 2000;

export default function Home() {
  const [url, setUrl] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [longSummary, setLongSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedInfo, setProcessedInfo] = useState<{truncated: boolean, originalLength: number, processedLength: number} | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const { data: session, status } = useSession();

  const [showToneSampleModal, setShowToneSampleModal] = useState(false);
  const [currentDbSample, setCurrentDbSample] = useState("");
  const [isSavingToneSample, setIsSavingToneSample] = useState(false);
  const [toneSampleError, setToneSampleError] = useState<string | null>(null);
  const [toneSampleSuccessMessage, setToneSampleSuccessMessage] = useState<string | null>(null);
  const [amazonKeywords, setAmazonKeywords] = useState<string[]>([]);
  const [amazonProducts, setAmazonProducts] = useState<AmazonProductType[]>([]);
  const [amazonProductsLoading, setAmazonProductsLoading] = useState(false);
  const [amazonProductsError, setAmazonProductsError] = useState<string | null>(
    null
  );

  const extractKeywords = (text: string, max: number = 3): string[] => {
    const tokens = text.match(/[\p{Script=Han}々]+|[ァ-ヶー]+|[a-zA-Z]+/gu) || [];
    const freq: Record<string, number> = {};
    tokens.forEach((t) => {
      if (t.length < 2) return;
      freq[t] = (freq[t] || 0) + 1;
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([w]) => w);
  };

  const handleSummarize = async (
    selectedTone: "casual" | "formal" | "custom"
  ) => {
    if (!url) {
      alert("URLを入力してください");
      return;
    }
    if (isLoading) return;

    if (selectedTone === "custom" && !currentDbSample) {
      alert("自分の口調サンプルが登録されていません。");
      return;
    }

    setIsLoading(true);
    setError(null);
    setShortSummary("");
    setLongSummary("");
    setProcessedInfo(null);

    try {
      const requests = selectedTone === "custom"
        ? [
            fetch('/api/summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, mode: 'short', tone: 'custom', toneSample: currentDbSample })
            }),
            fetch('/api/summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, mode: 'long', tone: 'custom', toneSample: currentDbSample })
            })
          ]
        : [
            fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=short&tone=${selectedTone}`),
            fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=long&tone=${selectedTone}`)
          ];
      const [shortRes, longRes] = await Promise.all(requests);

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
    setProcessedInfo(null);
    setAmazonKeywords([]);
    setAmazonProducts([]);
    setAmazonProductsError(null);
    setAmazonProductsLoading(false);
  };

  useEffect(() => {
    if (showContactModal || showToneSampleModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showContactModal, showToneSampleModal]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch('/api/tone-sample', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data.toneSample !== undefined) {
            setCurrentDbSample(data.toneSample);
          }
        })
        .catch(err => console.error('Failed to fetch tone sample', err));
    } else {
      setCurrentDbSample("");
    }
  }, [status]);

  useEffect(() => {
    const summaryText = longSummary || shortSummary;
    if (summaryText) {
      setAmazonKeywords(extractKeywords(summaryText, 3));
    } else {
      setAmazonKeywords([]);
    }
  }, [shortSummary, longSummary]);

  useEffect(() => {
    if (amazonKeywords.length === 0) {
      setAmazonProducts([]);
      setAmazonProductsError(null);
      setAmazonProductsLoading(false);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const fetchProducts = async () => {
      setAmazonProductsLoading(true);
      setAmazonProductsError(null);
      try {
        const response = await fetch("/api/amazon-products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ keywords: amazonKeywords }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Amazon商品の取得に失敗しました。");
        }

        const data: { products?: AmazonProductType[]; error?: string } =
          await response.json();

        if (!isCancelled) {
          setAmazonProducts(data.products || []);
          if (data.error) {
            setAmazonProductsError(data.error);
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        if (!isCancelled) {
          console.error("Failed to fetch Amazon products", err);
          setAmazonProducts([]);
          setAmazonProductsError(
            err?.message || "Amazon商品の取得に失敗しました。"
          );
        }
      } finally {
        if (!isCancelled) {
          setAmazonProductsLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [amazonKeywords]);

  const handleSaveToneSample = async (sampleToSave: string) => {
    setIsSavingToneSample(true);
    setToneSampleError(null);
    setToneSampleSuccessMessage(null);

    try {
      const response = await fetch('/api/tone-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toneSample: sampleToSave }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '口調サンプルの保存に失敗しました。');
      }
      setToneSampleSuccessMessage(result.message || '口調サンプルを保存しました！');
      setCurrentDbSample(sampleToSave);
      setTimeout(() => {
        setShowToneSampleModal(false);
        setTimeout(() => setToneSampleSuccessMessage(null), 1500);
      }, 1500);

    } catch (err: any) {
      console.error("Failed to save tone sample:", err);
      setToneSampleError(err.message || '口調サンプルの保存中にエラーが発生しました。');
    } finally {
      setIsSavingToneSample(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-slate-700 font-sans">
      <div className="w-full max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_minmax(260px,0.95fr)]">
          <div className="w-full rounded-lg bg-white p-6 shadow-md">
            <h1 className="text-3xl font-semibold mb-2 text-center text-blue-600">
              AI記事要約.com
            </h1>
            <p className="text-sm text-slate-500 mb-6 text-center">
              記事URLをペーストして、お好みのスタイルでAIが要約します。
            </p>

            <div className="text-xs text-slate-500 mb-4 text-right pr-1">
              {status === "loading" && <p>読込中...</p>}
              {status === "authenticated" && session?.user && (
                <div className="flex items-center justify-end space-x-2">
                  {session.user.image && (
                    <img src={session.user.image} alt="avatar" className="w-5 h-5 rounded-full" />
                  )}
                  <span>{session.user.name || session.user.email}</span>
                  <button
                    onClick={() => signOut()}
                    className="px-2 py-0.5 border border-slate-300 rounded hover:bg-slate-100 text-slate-600 text-[10px]"
                  >
                    ログアウト
                  </button>
                </div>
              )}
              {status === "unauthenticated" && (
                <button
                  onClick={() => signIn("google")}
                  className="px-2 py-0.5 border border-slate-300 rounded hover:bg-slate-100 text-slate-600 text-[10px]"
                >
                  Googleログイン
                </button>
              )}
            </div>

            {status === "authenticated" && (
              <div className="mb-4 text-center">
                <button
                  onClick={() => {
                    setToneSampleError(null);
                    setToneSampleSuccessMessage(null);
                    setShowToneSampleModal(true);
                  }}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-md font-medium hover:bg-slate-200 border border-slate-300"
                >
                  自分の口調を登録・編集する
                </button>
              </div>
            )}

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

            <div className={`grid gap-3 mb-4 ${status === 'authenticated' ? 'grid-cols-3' : 'grid-cols-2'}`}>
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
              {status === "authenticated" && (
                <button
                  onClick={() => handleSummarize("custom")}
                  className={`w-full px-4 py-2.5 bg-green-600 text-white text-base rounded-md font-medium hover:bg-green-700 active:bg-green-800 transition-colors focus:outline-none focus:ring-1 focus:ring-green-400 focus:ring-offset-1 ${
                    isLoading || !currentDbSample ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={isLoading || !currentDbSample}
                >
                  {isLoading ? "処理中..." : "自分の口調"}
                </button>
              )}
            </div>
            <div className="flex justify-center mb-6">
              <button
                onClick={handleReset}
                className="w-auto px-6 py-2 bg-slate-400 text-white text-base rounded-md font-medium hover:bg-slate-500 active:bg-slate-600 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-300 focus:ring-offset-1"
                disabled={
                  isLoading || (!url && !shortSummary && !longSummary && !error)
                }
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
          <AmazonProductShowcase
            keywords={amazonKeywords}
            products={amazonProducts}
            isLoading={amazonProductsLoading}
            error={amazonProductsError}
          />
        </div>

        <footer className="mt-8 text-center text-xs text-slate-400">
          <p className="mb-1">
            <button
              onClick={() => setShowContactModal(true)}
              className="hover:underline focus:outline-none"
            >
              ご連絡はこちら
            </button>
          </p>
          <p className="mb-1 text-[10px] leading-tight px-2">
            当サイトは、Amazon.co.jpを宣伝しリンクすることによってサイトが紹介料を獲得できる手段を提供することを目的に設定されたアフィリエイトプログラムである、Amazonアソシエイト・プログラムの参加者です。
          </p>
          <p className="mt-1">© {new Date().getFullYear()} AI記事要約.com</p>
        </footer>
      </div>

      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-700">ご連絡</h2>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              ご意見、ご感想、その他お問い合わせは、以下のメールアドレス宛にお願いいたします。
            </p>
            
              href="mailto:ts@ai.aizu-tv.com?subject=AI記事要約.comへのお問い合わせ"
              className="block w-full text-center px-4 py-2.5 bg-blue-500 text-white text-base rounded-md font-medium hover:bg-blue-600 transition-colors"
              onClick={() => setShowContactModal(false)}
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

      {showToneSampleModal && (
        <ToneSampleModal
          isOpen={showToneSampleModal}
          onClose={() => setShowToneSampleModal(false)}
          currentSample={currentDbSample}
          onSave={handleSaveToneSample}
          maxLength={FREE_USER_TONE_SAMPLE_MAX_LENGTH}
          isSaving={isSavingToneSample}
          saveError={toneSampleError}
          saveSuccessMessage={toneSampleSuccessMessage}
        />
      )}
    </main>
  );
}
