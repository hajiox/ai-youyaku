// /app/page.tsx ver.12 (登録リンクのみ版)
'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import AmazonProductShowcase from './components/AmazonProductShowcase';
import ToneSampleModal from './components/ToneSampleModal';

type AmazonProduct = {
  asin: string;
  title: string;
  url: string;
  imageUrl?: string;
  source: 'registered-link';
};

export default function Home() {
  const { data: session } = useSession();
  const [url, setUrl] = useState('');
  const [tone, setTone] = useState<'casual' | 'formal' | 'custom'>('casual');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [summaryLength, setSummaryLength] = useState<'short' | 'detailed'>('short');
  const [summary, setSummary] = useState('');
  const [detailedSummary, setDetailedSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toneSample, setToneSample] = useState('');
  const [showToneModal, setShowToneModal] = useState(false);

  const [products, setProducts] = useState<AmazonProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (session?.user?.email) {
      loadToneSample();
    }
  }, [session]);

  const loadToneSample = async () => {
    try {
      const response = await fetch('/api/tone-sample');
      if (response.ok) {
        const data = await response.json();
        setToneSample(data.toneSample || '');
      }
    } catch (error) {
      console.error('口調サンプルの読み込みエラー:', error);
    }
  };

  const handleSaveToneSample = async (sample: string) => {
    try {
      const response = await fetch('/api/tone-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toneSample: sample })
      });

      if (response.ok) {
        setToneSample(sample);
        setShowToneModal(false);
        alert('口調サンプルを保存しました');
      } else {
        alert('保存に失敗しました');
      }
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存中にエラーが発生しました');
    }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    
    try {
      const response = await fetch('/api/amazon-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMobile })
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('商品取得エラー:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleSummarize = async (selectedTone?: 'casual' | 'formal' | 'custom') => {
    const currentTone = selectedTone || tone;

    if (!url.trim()) {
      setError('URLを入力してください');
      return;
    }

    setLoading(true);
    setError('');
    setSummary('');
    setDetailedSummary('');
    setProducts([]);

    try {
      const shortResponse = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          tone: currentTone, 
          mode: 'short',
          toneSample: currentTone === 'custom' ? toneSample : undefined
        })
      });

      const shortData = await shortResponse.json();

      if (!shortResponse.ok) {
        throw new Error(shortData.error || '要約の生成に失敗しました');
      }
      if (!shortData.summary) {
        throw new Error('要約データが空でした。別の記事でお試しください。');
      }

      setSummary(shortData.summary);

      const detailedResponse = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          tone: currentTone, 
          mode: 'long',
          toneSample: currentTone === 'custom' ? toneSample : undefined
        })
      });

      if (detailedResponse.ok) {
        const detailedData = await detailedResponse.json();
        if (detailedData.summary) {
          setDetailedSummary(detailedData.summary);
        }
      }

      await fetchProducts();

    } catch (err) {
      setError(err instanceof Error ? err.message : '要約の生成に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToneButtonClick = (selectedTone: 'casual' | 'formal') => {
    setTone(selectedTone);
    handleSummarize(selectedTone);
  };

  const handleReset = () => {
    setUrl('');
    setSummary('');
    setDetailedSummary('');
    setError('');
    setProducts([]);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('コピーしました');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-indigo-600 mb-2">AI記事要約.com</h1>
            <p className="text-gray-600">記事URLをペーストして、お好みのスタイルでAIが要約します。</p>
            
            <div className="mt-4">
              {session ? (
                <div className="flex items-center justify-center gap-4">
                  <span className="text-sm text-gray-600">ログイン中: {session.user?.email}</span>
                  <button
                    onClick={() => setShowToneModal(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    口調設定
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    ログアウト
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Googleログイン
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="記事URLを入力してください"
              className="w-full px-4 py-3 border border-gray-300 rounded-md mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />

            <div className="flex gap-4 mb-4">
              <button
                onClick={() => handleToneButtonClick('casual')}
                disabled={loading}
                className="flex-1 py-3 rounded-md font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading && tone === 'casual' ? '要約中...' : 'カジュアルで要約'}
              </button>
              <button
                onClick={() => handleToneButtonClick('formal')}
                disabled={loading}
                className="flex-1 py-3 rounded-md font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading && tone === 'formal' ? '要約中...' : 'フォーマルで要約'}
              </button>
            </div>

            {session && (
              <>
                <button
                  onClick={() => setTone('custom')}
                  className={`w-full py-3 rounded-md font-medium transition-colors mb-4 ${
                    tone === 'custom' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  カスタム口調{toneSample && ' (設定済み)'}
                </button>

                {tone === 'custom' && (
                  <button
                    onClick={() => handleSummarize()}
                    disabled={loading}
                    className="w-full py-3 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-4"
                  >
                    {loading ? '要約中...' : 'カスタム口調で要約'}
                  </button>
                )}
              </>
            )}

            <button
              onClick={handleReset}
              className="w-full py-3 bg-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-400 transition-colors"
            >
              リセット
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}
          </div>

          {(summary || detailedSummary) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                {summary && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-800">200字要約</h2>
                      <button
                        onClick={() => handleCopy(summary)}
                        className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-md text-sm hover:bg-indigo-200 transition-colors"
                      >
                        コピー
                      </button>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{summary}</p>
                  </div>
                )}

                {detailedSummary && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-800">1000字要約</h2>
                      <button
                        onClick={() => handleCopy(detailedSummary)}
                        className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-md text-sm hover:bg-indigo-200 transition-colors"
                      >
                        コピー
                      </button>
                    </div>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{detailedSummary}</p>
                  </div>
                )}
              </div>

              <div>
                <AmazonProductShowcase
                  products={products}
                  isLoading={productsLoading}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">© 2024 AI記事要約.com - Powered by Gemini AI</p>
        </div>
      </footer>

      {showToneModal && (
        <ToneSampleModal
          currentSample={toneSample}
          onSave={handleSaveToneSample}
          onClose={() => setShowToneModal(false)}
        />
      )}
    </div>
  );
}
