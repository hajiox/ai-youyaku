// /app/page.tsx ver.14 - 3プラットフォームUI版
'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import AmazonProductShowcase from './components/AmazonProductShowcase';
import ToneSampleModal from './components/ToneSampleModal';

type SummaryResult = {
  twitter: string;
  threads: string;
  note: string;
};

type AmazonProduct = {
  asin: string;
  title: string;
  url: string;
  imageUrl?: string;
  source?: string;
};

export default function Home() {
  const { data: session } = useSession();
  const [url, setUrl] = useState('');
  const [tone, setTone] = useState<'casual' | 'formal' | 'custom'>('casual');
  
  // 要約結果をオブジェクトで管理
  const [summaries, setSummaries] = useState<SummaryResult | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 口調設定関連
  const [toneSample, setToneSample] = useState('');
  const [showToneModal, setShowToneModal] = useState(false);
  const [isSavingTone, setIsSavingTone] = useState(false);
  const [saveToneError, setSaveToneError] = useState<string | null>(null);
  const [saveToneSuccess, setSaveToneSuccess] = useState<string | null>(null);

  // Amazon商品関連
  const [amazonKeywords, setAmazonKeywords] = useState<string[]>([]);
  const [amazonProducts, setAmazonProducts] = useState<AmazonProduct[]>([]);
  const [amazonLoading, setAmazonLoading] = useState(false);
  const [amazonError, setAmazonError] = useState<string | null>(null);

  // モバイル判定
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (session?.user?.email) loadToneSample();
  }, [session]);

  const loadToneSample = async () => {
    try {
      const response = await fetch('/api/tone-sample');
      if (response.ok) {
        const data = await response.json();
        setToneSample(data.toneSample || '');
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveToneSample = async (sample: string) => {
    setIsSavingTone(true);
    setSaveToneError(null);
    setSaveToneSuccess(null);
    try {
      const response = await fetch('/api/tone-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toneSample: sample })
      });
      if (response.ok) {
        setToneSample(sample);
        setSaveToneSuccess('保存しました');
        setTimeout(() => { setShowToneModal(false); setSaveToneSuccess(null); }, 1500);
      } else {
        setSaveToneError('保存に失敗しました');
      }
    } catch (e) {
      setSaveToneError('エラーが発生しました');
    } finally {
      setIsSavingTone(false);
    }
  };

  // 商品取得（noteの要約からキーワード抽出）
  const fetchAmazonProducts = async (text: string) => {
    // 簡易キーワード抽出（3文字以上のカタカナ/漢字）
    const keywords = text.match(/[ァ-ヶー]{3,}|[一-龠]{2,}/g) || [];
    const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 3);
    
    setAmazonKeywords(uniqueKeywords);
    
    if (uniqueKeywords.length === 0) return;

    setAmazonLoading(true);
    try {
      const response = await fetch('/api/amazon-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMobile }) // キーワード検索廃止済みのためisMobileのみ
      });
      if (response.ok) {
        const data = await response.json();
        setAmazonProducts(data.products || []);
      }
    } catch (e) {
      setAmazonError('商品取得エラー');
    } finally {
      setAmazonLoading(false);
    }
  };

  const handleSummarize = async (selectedTone?: 'casual' | 'formal' | 'custom') => {
    const currentTone = selectedTone || tone;
    if (!url.trim()) { setError('URLを入力してください'); return; }

    setLoading(true);
    setError('');
    setSummaries(null);
    setAmazonProducts([]);

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          tone: currentTone, 
          toneSample: currentTone === 'custom' ? toneSample : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || '要約失敗');
      if (!data.summary) throw new Error('要約データが空でした');

      setSummaries(data.summary);
      
      // note要約を使って商品検索（一番情報量が多いため）
      if (data.summary.note) {
        fetchAmazonProducts(data.summary.note);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleToneButtonClick = (t: 'casual' | 'formal') => {
    setTone(t);
    handleSummarize(t);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('コピーしました！');
  };

  const handleReset = () => {
    setUrl('');
    setSummaries(null);
    setError('');
    setAmazonProducts([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {/* ヘッダーエリア */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-3 tracking-tight">
            AI記事要約.com
          </h1>
          <p className="text-slate-500 text-sm md:text-base">
            記事URLひとつで、X・Threads・note用の要約を一括生成します。
          </p>
          
          <div className="mt-6 flex flex-wrap justify-center items-center gap-4">
            {session ? (
              <>
                <div className="flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-xs text-slate-600">{session.user?.email}</span>
                </div>
                <button
                  onClick={() => setShowToneModal(true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full transition-colors"
                >
                  自分の口調を設定
                </button>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition-all"
              >
                Googleでログインして機能制限を解除
              </button>
            )}
          </div>
        </div>

        {/* 入力エリア */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg mb-6 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400"
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <button
              onClick={() => handleToneButtonClick('casual')}
              disabled={loading}
              className="py-3 px-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 shadow-sm transition-all disabled:opacity-50"
            >
              😊 カジュアル
            </button>
            <button
              onClick={() => handleToneButtonClick('formal')}
              disabled={loading}
              className="py-3 px-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 shadow-sm transition-all disabled:opacity-50"
            >
              👔 フォーマル
            </button>
            
            {session && (
              <>
                <button
                  onClick={() => { setTone('custom'); handleSummarize('custom'); }}
                  disabled={loading}
                  className={`col-span-2 md:col-span-2 py-3 px-2 rounded-lg text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50 ${
                    toneSample 
                      ? "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700" 
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                >
                  ✨ あなたの口調で要約 {toneSample ? "" : "(未設定)"}
                </button>
              </>
            )}
          </div>

          {(summaries || error) && (
            <button
              onClick={handleReset}
              className="w-full py-2 text-slate-400 hover:text-slate-600 text-sm transition-colors"
            >
              入力をリセット
            </button>
          )}

          {loading && (
            <div className="mt-6 text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-100 border-t-indigo-500 mb-2"></div>
              <p className="text-indigo-600 font-medium animate-pulse">
                3つのプラットフォーム用に書き分けています...
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
              🚨 {error}
            </div>
          )}
        </div>

        {/* 結果表示エリア */}
        {summaries && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 左カラム：要約結果 */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* X (Twitter) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-4 py-3 flex justify-between items-center">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="text-lg">𝕏</span> 
                    <span className="text-xs font-normal text-slate-400">130文字以内</span>
                  </h3>
                  <button onClick={() => handleCopy(summaries.twitter)} className="text-xs bg-slate-700 text-white px-3 py-1 rounded hover:bg-slate-600 transition-colors">コピー</button>
                </div>
                <div className="p-5">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{summaries.twitter}</p>
                </div>
              </div>

              {/* Threads */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-black px-4 py-3 flex justify-between items-center">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span>@ Threads</span>
                    <span className="text-xs font-normal text-gray-400">480文字以内</span>
                  </h3>
                  <button onClick={() => handleCopy(summaries.threads)} className="text-xs bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors">コピー</button>
                </div>
                <div className="p-5">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{summaries.threads}</p>
                </div>
              </div>

              {/* note */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-[#41c9b4] px-4 py-3 flex justify-between items-center">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span>note</span>
                    <span className="text-xs font-normal text-white/80">詳細要約</span>
                  </h3>
                  <button onClick={() => handleCopy(summaries.note)} className="text-xs bg-[#2da896] text-white px-3 py-1 rounded hover:bg-[#238c7d] transition-colors">コピー</button>
                </div>
                <div className="p-5">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{summaries.note}</p>
                </div>
              </div>

            </div>

            {/* 右カラム：登録リンク（広告） */}
            <div className="lg:col-span-1">
               <AmazonProductShowcase
                  keywords={amazonKeywords} // note要約から抽出したキーワード
                  products={amazonProducts}
                  isLoading={amazonLoading}
                  error={amazonError}
                  partnerTag=""
                />
            </div>
          </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>© 2025 AI記事要約.com</p>
        </div>
      </footer>

      {showToneModal && (
        <ToneSampleModal
          isOpen={showToneModal}
          maxLength={2000}
          currentSample={toneSample}
          onSave={handleSaveToneSample}
          onClose={() => setShowToneModal(false)}
          isSaving={isSavingTone}
          saveError={saveToneError}
          saveSuccessMessage={saveToneSuccess}
        />
      )}
    </div>
  );
}
