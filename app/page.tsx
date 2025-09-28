// app/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import AmazonProductShowcase, {
  AmazonProduct as AmazonProductType,
} from "./components/AmazonProductShowcase";
import ToneSampleModal from "./components/ToneSampleModal"; // â˜… ã‚¤ãƒ³ãƒãƒ¼ãƒˆãƒ‘ã‚¹ã‚’ç›¸å¯¾ãƒ‘ã‚¹ã«å¤‰æ›´

// APIã‹ã‚‰è¿”ã£ã¦ãã‚‹å£èª¿ã‚µãƒ³ãƒ—ãƒ«ã®åž‹ (å°†æ¥çš„ã«GETã§ä½¿ã†å ´åˆ)
// interface UserToneSampleData {
//   id: string;
//   user_id: string;
//   tone_sample: string;
//   character_limit: number;
//   created_at: string;
//   updated_at: string;
// }

// ç„¡æ–™ãƒ¦ãƒ¼ã‚¶ãƒ¼ã®å£èª¿ã‚µãƒ³ãƒ—ãƒ«ã®æœ€å¤§æ–‡å­—æ•° (APIå´ã¨åˆã‚ã›ã‚‹)
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
    const tokens = text.match(/[\p{Script=Han}ã€…]+|[ã‚¡-ãƒ¶ãƒ¼]+|[a-zA-Z]+/gu) || [];
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
      alert("URLã‚’å…¥åŠ›ã—ã¦ãã ã•ã„");
      return;
    }
    if (isLoading) return;

    if (selectedTone === "custom" && !currentDbSample) {
      alert("è‡ªåˆ†ã®å£èª¿ã‚µãƒ³ãƒ—ãƒ«ãŒç™»éŒ²ã•ã‚Œã¦ã„ã¾ã›ã‚“ã€‚");
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
        shortError = `200æ–‡å­—è¦ç´„ã‚¨ãƒ©ãƒ¼: ${shortRes.status}`;
        try { shortData = await shortRes.json(); if(shortData.error) shortError = shortData.error; } catch {}
      } else {
        shortData = await shortRes.json();
      }

      if (!longRes.ok) {
        longError = `1000æ–‡å­—è¦ç´„ã‚¨ãƒ©ãƒ¼: ${longRes.status}`;
        try { longData = await longRes.json(); if(longData.error) longError = longData.error; } catch {}
      } else {
        longData = await longRes.json();
      }

      if (shortError || longError) {
        throw new Error(shortError || longError || "è¦ç´„ä¸­ã«ã‚¨ãƒ©ãƒ¼ãŒç™ºç”Ÿã—ã¾ã—ãŸ");
      }

      setShortSummary(shortData.result || "200æ–‡å­—è¦ç´„ã®å–å¾—ã«å¤±æ•—ã—ã¾ã—ãŸ");
      setLongSummary(longData.result || "1000æ–‡å­—è¦ç´„ã®å–å¾—ã«å¤±æ•—ã—ã¾ã—ãŸ");

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
      setError(err.message || "è¦ç´„ä¸­ã«ä¸æ˜Žãªã‚¨ãƒ©ãƒ¼ãŒç™ºç”Ÿã—ã¾ã—ãŸ");
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
        alert("ã‚³ãƒ”ãƒ¼ã—ã¾ã—ãŸï¼");
      })
      .catch(err => {
        console.error("ã‚³ãƒ”ãƒ¼ã«å¤±æ•—ã—ã¾ã—ãŸ: ", err);
        alert("ã‚³ãƒ”ãƒ¼ã«å¤±æ•—ã—ã¾ã—ãŸã€‚");
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

  // ãƒ­ã‚°ã‚¤ãƒ³å¾Œã«å£èª¿ã‚µãƒ³ãƒ—ãƒ«ã‚’å–å¾—
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

  // è¦ç´„æ–‡ã‹ã‚‰Amazonæ¤œç´¢ç”¨ã‚­ãƒ¼ãƒ¯ãƒ¼ãƒ‰ã‚’æŠ½å‡º
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
          throw new Error("Amazonå•†å“ã®å–å¾—ã«å¤±æ•—ã—ã¾ã—ãŸã€‚");
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
            err?.message || "Amazonå•†å“ã®å–å¾—ã«å¤±æ•—ã—ã¾ã—ãŸã€‚"
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
        throw new Error(result.error || 'å£èª¿ã‚µãƒ³ãƒ—ãƒ«ã®ä¿å­˜ã«å¤±æ•—ã—ã¾ã—ãŸã€‚');
      }
      setToneSampleSuccessMessage(result.message || 'å£èª¿ã‚µãƒ³ãƒ—ãƒ«ã‚’ä¿å­˜ã—ã¾ã—ãŸï¼');
      setCurrentDbSample(sampleToSave);
      setTimeout(() => {
        setShowToneSampleModal(false);
        // æˆåŠŸãƒ¡ãƒƒã‚»ãƒ¼ã‚¸ã‚‚å°‘ã—é…ã‚Œã¦æ¶ˆã™ã‹ã€ãƒ¢ãƒ¼ãƒ€ãƒ«ã‚’é–‰ã˜ã‚‹ã‚¿ã‚¤ãƒŸãƒ³ã‚°ã§ã‚¯ãƒªã‚¢ã™ã‚‹
        setTimeout(() => setToneSampleSuccessMessage(null), 1500);
      }, 1500);

    } catch (err: any) {
      console.error("Failed to save tone sample:", err);
      setToneSampleError(err.message || 'å£èª¿ã‚µãƒ³ãƒ—ãƒ«ã®ä¿å­˜ä¸­ã«ã‚¨ãƒ©ãƒ¼ãŒç™ºç”Ÿã—ã¾ã—ãŸã€‚');
    } finally {
      setIsSavingToneSample(false);
    }
  };


  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 p-4 text-slate-700 font-sans">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_minmax(260px,0.95fr)]">
        <div className="w-full rounded-lg bg-white p-6 shadow-md">
        <h1 className="text-3xl font-semibold mb-2 text-center text-blue-600">
          AIè¨˜äº‹è¦ç´„.com
        </h1>
        <p className="text-sm text-slate-500 mb-6 text-center">
          è¨˜äº‹URLã‚’ãƒšãƒ¼ã‚¹ãƒˆã—ã¦ã€ãŠå¥½ã¿ã®ã‚¹ã‚¿ã‚¤ãƒ«ã§AIãŒè¦ç´„ã—ã¾ã™ã€‚
        </p>

        <div className="text-xs text-slate-500 mb-4 text-right pr-1">
          {status === "loading" && <p>èª­è¾¼ä¸­...</p>}
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
                ãƒ­ã‚°ã‚¢ã‚¦ãƒˆ
              </button>
            </div>
          )}
          {status === "unauthenticated" && (
            <button
              onClick={() => signIn("google")}
              className="px-2 py-0.5 border border-slate-300 rounded hover:bg-slate-100 text-slate-600 text-[10px]"
            >
              Googleãƒ­ã‚°ã‚¤ãƒ³
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
              è‡ªåˆ†ã®å£èª¿ã‚’ç™»éŒ²ãƒ»ç·¨é›†ã™ã‚‹
            </button>
          </div>
        )}

        <div className="mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="è¨˜äº‹URLã‚’å…¥åŠ›"
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
            {isLoading ? "å‡¦ç†ä¸­..." : "ã‚«ã‚¸ãƒ¥ã‚¢ãƒ«"}
          </button>
          <button
            onClick={() => handleSummarize("formal")}
            className={`w-full px-4 py-2.5 bg-indigo-500 text-white text-base rounded-md font-medium hover:bg-indigo-600 active:bg-indigo-700 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:ring-offset-1 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? "å‡¦ç†ä¸­..." : "ãƒ•ã‚©ãƒ¼ãƒžãƒ«"}
          </button>
          {status === "authenticated" && (
            <button
              onClick={() => handleSummarize("custom")}
              className={`w-full px-4 py-2.5 bg-green-600 text-white text-base rounded-md font-medium hover:bg-green-700 active:bg-green-800 transition-colors focus:outline-none focus:ring-1 focus:ring-green-400 focus:ring-offset-1 ${
                isLoading || !currentDbSample ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isLoading || !currentDbSample}
            >
              {isLoading ? "å‡¦ç†ä¸­..." : "è‡ªåˆ†ã®å£èª¿"}
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
            ãƒªã‚»ãƒƒãƒˆ
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-600 rounded-md text-sm">
            <p>{error}</p>
          </div>
        )}

        {processedInfo && processedInfo.truncated && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 text-yellow-600 rounded-md text-sm">
            <p>â„¹ï¸ è¨˜äº‹ãŒé•·ã„ãŸã‚ã€å…ˆé ­{processedInfo.processedLength.toLocaleString()}æ–‡å­—ã§è¦ç´„ã—ã¾ã—ãŸã€‚(åŽŸæ–‡: {processedInfo.originalLength.toLocaleString()}æ–‡å­—)</p>
          </div>
        )}

        {shortSummary && (
          <div className="mt-6 p-4 border border-slate-200 rounded-md bg-white">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-slate-700">200å­—è¦ç´„</h2>
              <button
                onClick={() => copyText(shortSummary)}
                className="text-xs text-white bg-slate-500 px-3 py-1 rounded hover:bg-slate-600 transition-colors"
              >
                ã‚³ãƒ”ãƒ¼
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{shortSummary}</p>
          </div>
        )}

        {longSummary && (
          <div className="mt-4 p-4 border border-slate-200 rounded-md bg-white">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-slate-700">1000å­—è¦ç´„</h2>
              <button
                onClick={() => copyText(longSummary)}
                className="text-xs text-white bg-slate-500 px-3 py-1 rounded hover:bg-slate-600 transition-colors"
              >
                ã‚³ãƒ”ãƒ¼
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

      <footer className="mt-4 text-center text-xs text-slate-400">
        <p className="mb-1">
          <button
            onClick={() => setShowContactModal(true)}
            className="hover:underline focus:outline-none"
          >
            ã”é€£çµ¡ã¯ã“ã¡ã‚‰
          </button>
        </p>
        <p className="mb-1 text-[10px] leading-tight px-2">
          å½“ã‚µã‚¤ãƒˆã¯ã€Amazon.co.jpã‚’å®£ä¼ã—ãƒªãƒ³ã‚¯ã™ã‚‹ã“ã¨ã«ã‚ˆã£ã¦ã‚µã‚¤ãƒˆãŒç´¹ä»‹æ–™ã‚’ç²å¾—ã§ãã‚‹æ‰‹æ®µã‚’æä¾›ã™ã‚‹ã“ã¨ã‚’ç›®çš„ã«è¨­å®šã•ã‚ŒãŸã‚¢ãƒ•ã‚£ãƒªã‚¨ã‚¤ãƒˆãƒ—ãƒ­ã‚°ãƒ©ãƒ ã§ã‚ã‚‹ã€Amazonã‚¢ã‚½ã‚·ã‚¨ã‚¤ãƒˆãƒ»ãƒ—ãƒ­ã‚°ãƒ©ãƒ ã®å‚åŠ è€…ã§ã™ã€‚
        </p>
        <p className="mt-1">Â© {new Date().getFullYear()} AIè¨˜äº‹è¦ç´„.com</p>
      </footer>

      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-700">ã”é€£çµ¡</h2>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
              >
                Ã—
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              ã”æ„è¦‹ã€ã”æ„Ÿæƒ³ã€ãã®ä»–ãŠå•ã„åˆã‚ã›ã¯ã€ä»¥ä¸‹ã®ãƒ¡ãƒ¼ãƒ«ã‚¢ãƒ‰ãƒ¬ã‚¹å®›ã«ãŠé¡˜ã„ã„ãŸã—ã¾ã™ã€‚
            </p>
            <a
              href="mailto:ts@ai.aizu-tv.com?subject=AIè¨˜äº‹è¦ç´„.comã¸ã®ãŠå•ã„åˆã‚ã›"
              className="block w-full text-center px-4 py-2.5 bg-blue-500 text-white text-base rounded-md font-medium hover:bg-blue-600 transition-colors"
              onClick={() => setShowContactModal(false)}
            >
              ãƒ¡ãƒ¼ãƒ«ã§å•ã„åˆã‚ã›ã‚‹
            </a>
            <button
              onClick={() => setShowContactModal(false)}
              className="mt-3 block w-full text-center px-4 py-2.5 bg-slate-200 text-slate-700 text-base rounded-md font-medium hover:bg-slate-300 transition-colors"
            >
              é–‰ã˜ã‚‹
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
