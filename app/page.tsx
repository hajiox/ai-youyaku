// /app/page.tsx ver.10
'use client';

import { useState, useEffect, FormEvent } from 'react';
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
  source?: 'article' | 'aizu-brand';
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
  const [toneSaving, setToneSaving] = useState(false);
  const [toneSaveError, setToneSaveError] = useState<string | null>(null);
  const [toneSaveSuccess, setToneSaveSuccess] = useState<string | null>(null);

  const TONE_SAMPLE_LIMIT = 2000;
  const toneLabel: Record<'casual' | 'formal' | 'custom', string> = {
    casual: 'カジュアル',
    formal: 'フォーマル',
    custom: 'マイ口調',
  };

  // Amazon商品関連のステート
  const [amazonKeywords, setAmazonKeywords] = useState<string[]>([]);
  const [amazonProducts, setAmazonProducts] = useState<AmazonProduct[]>([]);
  const [amazonLoading, setAmazonLoading] = useState(false);
  const [amazonError, setAmazonError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      loadToneSample();
    }
  }, [session]);

  const openToneModal = () => {
    setToneSaveError(null);
    setToneSaveSuccess(null);
    setShowToneModal(true);
  };

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
    setToneSaving(true);
    setToneSaveError(null);
    setToneSaveSuccess(null);

    try {
      const response = await fetch('/api/tone-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toneSample: sample })
      });

      const data = await response.json();

      if (response.ok) {
        setToneSample(sample);
        setToneSaveSuccess('口調サンプルを保存しました');
        setTone('custom');
        setTimeout(() => setShowToneModal(false), 400);
      } else {
        setToneSaveError(data?.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('保存エラー:', error);
      setToneSaveError('保存中にエラーが発生しました');
    } finally {
      setToneSaving(false);
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

  // Amazon商品を取得する関数（デバッグ情報表示対応）
  const fetchAmazonProducts = async (keywords: string[]) => {
    if (keywords.length === 0) return;
    
    setAmazonLoading(true);
    setAmazonError(null);
    
    try {
      const response = await fetch('/api/amazon-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords })
      });

      if (response.ok) {
        const data = await response.json();
        setAmazonProducts(data.products || []);
        
        // ★APIからデバッグエラーが返ってきていたら表示する
        if (data.debugError) {
          console.error('Amazon API Debug Error:', data.debugError);
          setAmazonError(`【開発者用ログ】Amazon APIエラー: ${data.debugError}`);
        }
      } else {
        setAmazonError('Amazon商品の取得に失敗しました');
        setAmazonProducts([]);
      }
    } catch (error) {
      console.error('Amazon商品取得エラー:', error);
      setAmazonError('Amazon商品の取得中にエラーが発生しました');
      setAmazonProducts([]);
    } finally {
      setAmazonLoading(false);
    }
  };

  const handleSummarize = async (event?: FormEvent) => {
    event?.preventDefault();
    const currentTone = tone;

    if (!url.trim()) {
      setError('URLを入力してください');
      return;
    }

    if (currentTone === 'custom' && !toneSample.trim()) {
      setError('カスタム口調で要約するには、口調サンプルを登録してください。');
      openToneModal();
      return;
    }

    setLoading(true);
    setError('');
    setSummary('');
    setDetailedSummary('');
    setAmazonKeywords([]);
    setAmazonProducts([]);

    try {
      const toneSampleForUse = currentTone === 'custom' ? toneSample : undefined;

      const shortResponse = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          tone: currentTone,
          mode: 'short',
          toneSample: toneSampleForUse
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
          toneSample: toneSampleForUse
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

  const handleToneSelect = (selectedTone: 'casual' | 'formal' | 'custom') => {
    setTone(selectedTone);
    setError('');

    if (selectedTone === 'custom' && !toneSample.trim()) {
      openToneModal();
    }
  };

  const handleReset = () => {
    setUrl('');
    setSummary('');
    setDetailedSummary('');
    setError('');
    setTone('casual');
    setAmazonKeywords([]);
    setAmazonProducts([]);
    setAmazonError(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('コピーしました');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-indigo-100">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                  1クリックで要約を開始
                </p>
                <h1 className="text-3xl font-bold text-slate-800 sm:text-4xl">AI記事要約.com</h1>
                <p className="text-sm text-slate-600 sm:text-base">
                  URLを貼ってトーンを選ぶだけ。Enterキーかメインボタンで200字と1000字の要約をまとめて作成します。
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 font-semibold text-green-700 ring-1 ring-green-100">
                    ✨ 口調サンプルを保存して自分の声で要約
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 ring-1 ring-amber-100">
                    ⚡️ 要約後はAmazon候補も自動表示
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 text-sm text-slate-600 md:items-end">
                {session ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                        ログイン中
                      </span>
                      <span className="text-xs sm:text-sm">{session.user?.email}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={openToneModal}
                        className="rounded-md border border-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-50"
                      >
                        口調サンプルを編集
                      </button>
                      <button
                        type="button"
                        onClick={() => signOut()}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        ログアウト
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => signIn('google')}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100 transition hover:-translate-y-0.5 hover:shadow"
                  >
                    Googleでログインして口調を保存
                  </button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSummarize} className="bg-white rounded-2xl shadow-md p-6 space-y-4 ring-1 ring-slate-100">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">記事URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="例: https://example.com/article"
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <p className="text-xs text-slate-500">Enterキーでも要約を開始できます。</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-700">
                <span className="font-semibold">要約トーン</span>
                <span className="text-xs text-slate-500">選択するとメインボタンがその口調で動きます</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => handleToneSelect('casual')}
                  className={`rounded-xl border px-4 py-3 text-left transition shadow-sm hover:-translate-y-0.5 hover:shadow-md ${
                    tone === 'casual'
                      ? 'border-blue-200 bg-blue-50 text-blue-800 ring-2 ring-blue-200'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>カジュアル</span>
                    {tone === 'casual' && <span className="text-xs text-blue-600">選択中</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">友達に話すような親しみやすい口調でざっくり要約。</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleToneSelect('formal')}
                  className={`rounded-xl border px-4 py-3 text-left transition shadow-sm hover:-translate-y-0.5 hover:shadow-md ${
                    tone === 'formal'
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>フォーマル</span>
                    {tone === 'formal' && <span className="text-xs text-indigo-600">選択中</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">ビジネスやレポート向けに端的で丁寧なまとめ。</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleToneSelect('custom')}
                  className={`rounded-xl border px-4 py-3 text-left transition shadow-sm hover:-translate-y-0.5 hover:shadow-md ${
                    tone === 'custom'
                      ? 'border-purple-200 bg-purple-50 text-purple-800 ring-2 ring-purple-200'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>マイ口調</span>
                    {tone === 'custom' && <span className="text-xs text-purple-600">選択中</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">あなたのポスト文体を真似した要約。{toneSample ? 'サンプル登録済み' : 'サンプル登録で精度UP'}</p>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-[11px] font-semibold text-purple-700">
                    {toneSample ? '保存済みサンプルを使用' : 'ログインでサンプル保存可'}
                  </div>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? '要約を生成中…' : `${toneLabel[tone]}で要約する`}
                  {!loading && <span className="text-xs font-bold">↵</span>}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  リセット
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={openToneModal}
                  className="rounded-full border border-purple-200 px-3 py-1.5 font-semibold text-purple-700 transition hover:bg-purple-50"
                >
                  口調サンプルを設定（最大{TONE_SAMPLE_LIMIT}文字）
                </button>
                <span>Enterキーでも要約を開始できます</span>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </form>

          {(summary || detailedSummary) && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                {summary && (
                  <div className="bg-white rounded-2xl shadow-md p-6 ring-1 ring-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Short</p>
                        <h2 className="text-xl font-bold text-gray-800">200字要約</h2>
                        <p className="text-xs text-slate-500">選択トーン: {toneLabel[tone]}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(summary)}
                        className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        コピー
                      </button>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{summary}</p>
                  </div>
                )}

                {detailedSummary && (
                  <div className="bg-white rounded-2xl shadow-md p-6 ring-1 ring-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Long</p>
                        <h2 className="text-xl font-bold text-gray-800">1000字要約</h2>
                        <p className="text-xs text-slate-500">選択トーン: {toneLabel[tone]}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(detailedSummary)}
                        className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
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

      <ToneSampleModal
        isOpen={showToneModal}
        currentSample={toneSample}
        onSave={handleSaveToneSample}
        onClose={() => setShowToneModal(false)}
        maxLength={TONE_SAMPLE_LIMIT}
        isSaving={toneSaving}
        saveError={toneSaveError}
        saveSuccessMessage={toneSaveSuccess}
      />
    </div>
  );
}
