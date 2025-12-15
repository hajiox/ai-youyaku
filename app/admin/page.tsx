// /app/admin/page.tsx ver.1
'use client';

import { useState, useEffect, useRef } from 'react';

type ManualProduct = {
  id: string;
  title: string;
  description: string;
  url: string;
  sort_order: number;
};

export default function AdminPage() {
  const [products, setProducts] = useState<ManualProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [metadataLoadingIndex, setMetadataLoadingIndex] = useState<number | null>(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  const createEmptyProduct = (order: number): ManualProduct => ({
    id: '',
    title: '',
    description: '',
    url: '',
    sort_order: order,
  });

  // 初期データ読み込み
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/manual-products');
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        setProducts(data.products);
      } else {
        setProducts([1, 2, 3, 4].map((order) => createEmptyProduct(order)));
      }
    } catch (e) {
      console.error(e);
      setMessage({ text: 'データの読み込みに失敗しました', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 入力内容の変更ハンドラ
  const handleChange = (index: number, field: keyof ManualProduct, value: string) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setProducts(newProducts);
  };

  const metadataTimers = useRef<Record<number, NodeJS.Timeout>>({});

  const fetchMetadata = async (index: number, targetUrl: string) => {
    if (!targetUrl) return;

    setMetadataLoadingIndex(index);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch(`/api/manual-products/metadata?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'メタデータ取得に失敗しました');
      }

      setProducts((prev) => {
        const next = [...prev];
        const current = next[index];

        if (!current) return prev;

        next[index] = {
          ...current,
          title: data.title || current.title,
          description: data.description || current.description,
          url: current.url || targetUrl,
        };

        return next;
      });

      setMessage({ text: '🔍 LPのOGP情報を自動取得しました', type: 'success' });
    } catch (error) {
      console.error(error);
      setMessage({ text: 'OGPの取得に失敗しました。URLをご確認ください。', type: 'error' });
    } finally {
      setMetadataLoadingIndex(null);
    }
  };

  const handleUrlChange = (index: number, targetUrl: string) => {
    setProducts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], url: targetUrl };
      return next;
    });

    if (metadataTimers.current[index]) {
      clearTimeout(metadataTimers.current[index]);
    }

    if (!targetUrl) return;

    metadataTimers.current[index] = setTimeout(() => {
      void fetchMetadata(index, targetUrl);
    }, 600);
  };

  const handleAddProduct = () => {
    setProducts((prev) => [...prev, createEmptyProduct(prev.length + 1)]);
  };

  const handleDeleteProduct = async (index: number) => {
    const target = products[index];

    try {
      if (target.id) {
        const res = await fetch(`/api/manual-products?id=${target.id}`, { method: 'DELETE' });
        if (!res.ok) {
          throw new Error('削除に失敗しました');
        }
      }

      setProducts((prev) => {
        const next = prev.filter((_, i) => i !== index);
        return next.length > 0 ? next : [createEmptyProduct(1)];
      });

      setMessage({ text: '🗑️ 登録済みLPを削除しました', type: 'success' });
    } catch (error) {
      console.error(error);
      setMessage({ text: '削除に失敗しました。再度お試しください。', type: 'error' });
    }
  };

  // 保存処理
  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/manual-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });

      if (res.ok) {
        setMessage({ text: '✅ 保存しました！サイトに反映されます。', type: 'success' });
      } else {
        throw new Error('保存失敗');
      }
    } catch (e) {
      console.error(e);
      setMessage({ text: '保存に失敗しました', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-500 font-semibold">Manual Override</p>
            <h1 className="text-2xl font-bold text-gray-800">商品管理画面</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:bg-gray-400 transition shadow-md"
          >
            {saving ? '保存中...' : '全商品を保存'}
          </button>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            LPのURLを貼り付けると、OGPタイトルと説明文が自動入力されます。価格や画像は不要です。
          </p>
          <button
            type="button"
            onClick={handleAddProduct}
            className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 border border-indigo-200"
          >
            ＋ 商品枠を追加
          </button>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="grid gap-6">
          {products.map((product, index) => (
            <div key={product.id || index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
                <div>
                  <p className="text-xs text-gray-400">枠番号 {product.sort_order}</p>
                  <h2 className="text-lg font-semibold text-gray-800">LP設定</h2>
                  {product.id && <p className="mt-1 text-xs text-gray-500">ID: {product.id}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    URL入力でOGP自動取得
                  </span>
                  <button
                    onClick={() => handleDeleteProduct(index)}
                    className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    <span aria-hidden>🗑️</span> 削除
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-3 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">LPのURL</label>
                  <input
                    type="text"
                    value={product.url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://example.com/..."
                  />
                  <p className="text-xs text-gray-500">
                    貼り付け後に自動でOGPタイトルと説明文を取得します。
                  </p>
                  {metadataLoadingIndex === index && (
                    <p className="text-xs font-semibold text-indigo-600">OGP情報を取得中...</p>
                  )}
                </div>

                <div className="space-y-3 md:col-span-2">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">OGPタイトル</label>
                      <input
                        type="text"
                        value={product.title}
                        onChange={(e) => handleChange(index, 'title', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                        placeholder="OGPから自動入力されます"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">OGP説明文</label>
                      <textarea
                        value={product.description}
                        onChange={(e) => handleChange(index, 'description', e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                        placeholder="OGPから自動入力されます"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 text-sm text-indigo-800">
                    OGPで取得できない場合は上書き入力してください。価格や画像URLは管理不要です。
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
