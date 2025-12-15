// /app/page.tsx ver.13 (ToneSampleModal修正版)
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
  price?: string;
  amount?: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  matchedKeywords?: string[];
  source?: 'article' | 'registered-link';
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
  
  // 口調設定モーダル関連
  const [toneSample, setToneSample] = useState('');
  const [showToneModal, setShowToneModal] = useState(false);
  const [isSavingTone, setIsSavingTone] = useState(false);
  const [saveToneError, setSaveToneError] = useState<string | null>(null);
  const [saveToneSuccess, setSaveToneSuccess] = useState<string | null>(null);

  // Amazon商品関連のステート
  const [amazonKeywords, setAmazonKeywords] = useState<string[]>([]);
  const [amazonProducts, setAmazonProducts] = useState<AmazonProduct[]>([]);
  const [amazonLoading, setAmazonLoading] = useState(false);
  const [amazonError, setAmazonError] = useState<string | null>(null);

  // モバイル判定
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // モバイル判定
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
        setSaveToneSuccess('口調サンプルを保存しました');
        // 成功したら少し待ってから閉じる
        setTimeout(() => {
          setShowToneModal(false);
          setSaveToneSuccess(null);
        }, 1500);
      } else {
        const data = await response.json();
        setSaveToneError(data.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('保存エラー:', error);
      setSaveToneError('保存中にエラーが発生しました');
    } finally {
      setIsSavingTone(false);
    }
  };

  // 要約からキーワードを抽出する関数
  const extractKeywords = (text: string): string[] => {
    if (!text) return [];

    const ignoreList = [
      'ねぇねぇ', 'なんか', 'すごい', 'これ', 'それ', 'あれ', 'どれ',
      '今日の', 'ニュース', '知ってる', 'あのね', '実は', 'なんと',
      'どう', '思う', 'ます', 'です', 'でした', 'ました', 'から', 'ので',
      'という', 'こと', 'もの', 'さん', 'くん', 'ちゃん', 'みたい', '感じ',
      '記事', '筆者', '概要', 'ポイント', 'まとめ',
      '本日', '今日', '昨日', '明日', '現在', '今回', '今後', '過去', '時点',
      '日本', '世界', '国内', '海外', '米国', '中国', '欧州', 
      '市場', '株式', '株価', '指数', '平均', '全体', '影響',
      '背景', '要因', '結果', '発表', '展開', '見通し', '状況', '状態',
      '上昇', '下落', '回復', '更新', '推移', '最高', '最低', '記録',
      '以上', '以下', '未満', '程度', '約', '円', 'ドル',
      '関連', '銘柄', '中心', '堅調', '好調', '不調', '需要'
    ];

    const candidates: string[] = [];
    const isValid = (w: string) => {
      const clean = w.trim();
      if (clean.length < 2 || clean.length > 20) return false;
      if (ignoreList.includes(clean)) return false;
      if (/^[\d০-৯]/.test(clean)) return false;
      if (/^(月|火|水|木|金|土|日)曜日?$/.test(clean)) return false;
      return true;
    };

    const katakanaMatches = text.match(/[ァ-ヶー]{2,}/g) || [];
    for (const w of katakanaMatches) {
      if (isValid(w) && !candidates.includes(w)) candidates.push(w);
    }
    const engMatches = text.match(/[A-Za-z]{2,}/g) || [];
    for (const w of engMatches) {
      if (isValid(w) && !candidates.includes(w)) candidates.push(w);
    }
    const kanjiMatches = text.match(/[一-龠]{2,}/g) || [];
    for (const w of kanjiMatches) {
      if (isValid(w) && !candidates.includes(w)) candidates.push(w);
    }
    return candidates.slice(0, 3);
  };

  // Amazon商品を取得する関数（モバイル判定を送信）
  const fetchAmazonProducts = async (keywords: string[]) => {
    if (keywords.length === 0) return;
    
    setAmazonLoading(true);
    setAmazonError(null);
    
    try {
      const response = await fetch('/api/amazon-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, isMobile })
      });

      if (response.ok) {
        const data = await response.json();
        setAmazonProducts(data.products || []);
        
        if (data.debugError) {
          console.error('Amazon API Debug Error:', data.debugError);
          setAmazonError(`【開発者用ログ】Amazon APIエラー: ${data.debugError}`);
        }
      } else {
        setAmazonError('商品の取得に失敗しました');
        setAmazonProducts([]);
      }
    } catch (error) {
      console.error('商品取得エラー:', error);
      setAmazonError('商品の取得中にエラーが発生しました');
      setAmazonProducts([]);
    } finally {
      setAmazonLoading(false);
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
    setAmazonKeywords([]);
    setAmazonProducts([]);

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

      const keywords = extractKeywords(shortData.summary);
      setAmazonKeywords(keywords);

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

      if (keywords.length > 0) {
        await fetchAmazonProducts(keywords);
      }

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
    setAmazonKeywords([]);
    setAmazonProducts([]);
    setAmazonError(null);
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
                  keywords={amazonKeywords}
                  products={amazonProducts}
                  isLoading={amazonLoading}
                  error={amazonError}
                  partnerTag={process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG}
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
