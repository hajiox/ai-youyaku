// /app/admin/page.tsx ver.1
'use client';

import { useState, useEffect, useRef } from 'react';

type ManualProduct = {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url: string;
  sort_order: number;
};

export default function AdminPage() {
  const [products, setProducts] = useState<ManualProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const metadataTimers = useRef<Record<number, NodeJS.Timeout>>({});

  const createEmptyProduct = (order: number): ManualProduct => ({
    id: '',
    title: '',
    description: '',
    url: '',
    image_url: '',
    sort_order: order,
  });

  const [metadataLoadingIndex, setMetadataLoadingIndex] = useState<number | null>(null);

  // 初期データ読み込み
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/manual-products');
      if (!res.ok) {
        throw new Error('failed to fetch');
      }

      const data = await res.json();

      if (data.products && data.products.length > 0) {
        const normalized = data.products.map((p: any, idx: number) => ({
          id: p.id || '',
          title: p.title || '',
          description: p.description || '',
          url: p.url || '',
          image_url: p.image_url || '',
          sort_order: p.sort_order ?? idx + 1,
        }));

        setProducts(normalized);
      } else {
        setProducts([1, 2, 3, 4].map((order) => createEmptyProduct(order)));
      }
    } catch (e) {
      console.error(e);
      setMessage({ text: 'データの読み込みに失敗しました', type: 'error' });
      setProducts([1, 2, 3, 4].map((order) => createEmptyProduct(order)));
    } finally {
      setLoading(false);
    }
  };

  // 入力内容の変更ハンドラ
  const handleChange = (index: number, field: keyof ManualProduct, value: string) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setProducts(newProducts);

    if (field === 'url') {
      const trimmed = value.trim();
      if (metadataTimers.current[index]) {
        clearTimeout(metadataTimers.current[index]);
      }

      if (trimmed && /^https?:\/\//i.test(trimmed)) {
        metadataTimers.current[index] = setTimeout(() => {
          handleFetchMetadata(index);
        }, 500);
      }
    }
  };

  const handleAddProduct = () => {
    setProducts((prev) => [...prev, createEmptyProduct(prev.length + 1)]);
  };

  const handleFetchMetadata = async (index: number) => {
    const targetUrl = products[index]?.url;
    if (!targetUrl) {
      setMessage({ text: 'URLを入力してください', type: 'error' });
      return;
    }

    setMetadataLoadingIndex(index);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch(`/api/manual-products/metadata?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'メタデータの取得に失敗しました');
      }

      setProducts((prev) => {
        const updated = [...prev];
        const current = updated[index];
        updated[index] = {
          ...current,
          title: data.title || current.title,
          description: data.description || current.description,
          image_url: data.imageUrl || current.image_url,
        };
        return updated;
      });

      setMessage({ text: 'OGP情報を取り込みました', type: 'success' });
    } catch (e) {
      console.error(e);
      setMessage({ text: 'OGP情報の取得に失敗しました', type: 'error' });
    } finally {
      setMetadataLoadingIndex(null);
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
        body: JSON.stringify({
          products: products.map((p, idx) => ({
            ...p,
            sort_order: p.sort_order ?? idx + 1,
          })),
        }),
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
          <h1 className="text-2xl font-bold text-gray-800">商品管理画面 (Manual Override)</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:bg-gray-400 transition shadow-md"
          >
            {saving ? '保存中...' : '全商品を保存'}
          </button>
        </div>

        <div className="mb-6 text-right">
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
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h2 className="text-lg font-semibold text-gray-700">商品枠 #{product.sort_order}</h2>
                <span className="text-xs text-gray-400">ID: {product.id}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左側：テキスト情報 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">商品タイトル</label>
                    <input
                      type="text"
                      value={product.title}
                      onChange={(e) => handleChange(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                      placeholder="例: 会津ブランド館 チャーシュー"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">説明文 (50文字以内推奨)</label>
                    <textarea
                      value={product.description}
                      onChange={(e) => handleChange(index, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                      placeholder="例: 秘伝のタレでじっくり煮込んだ自慢の逸品です。"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">リンク先URL（自社LPなど）</label>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                      <input
                        type="text"
                        value={product.url}
                        onChange={(e) => handleChange(index, 'url', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="https://example.com/lp"
                      />
                      <button
                        type="button"
                        onClick={() => handleFetchMetadata(index)}
                        disabled={metadataLoadingIndex === index}
                        className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 border border-indigo-200 disabled:opacity-60"
                      >
                        {metadataLoadingIndex === index ? '取得中...' : 'OGPを再取得'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">URLを入力すると自動でOGPタイトル・説明・画像を取り込みます。必要に応じて「OGPを再取得」で上書きできます。</p>
                  </div>
                </div>

                {/* 右側：画像設定とプレビュー */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">画像URL (OGP自動取得にも対応)</label>
                    <input
                      type="text"
                      value={product.image_url}
                      onChange={(e) => handleChange(index, 'image_url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="https://example.com/og-image.jpg"
                    />
                  </div>

                  <div className="mt-2 border-2 border-dashed border-gray-200 rounded-lg h-40 flex items-center justify-center bg-gray-50 overflow-hidden relative">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt="プレビュー" 
                        className="h-full w-full object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">画像URLを入力するとプレビューされます</span>
                    )}
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
