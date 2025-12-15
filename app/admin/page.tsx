// /app/admin/page.tsx ver.2
'use client';

import { useState, useEffect } from 'react';

type RegisteredLink = {
  id: string;
  url: string;
  title: string;
  description: string;
  ogp_image_url: string;
  created_at: string;
};

export default function AdminPage() {
  const [links, setLinks] = useState<RegisteredLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  // 新規登録用のステート
  const [newUrl, setNewUrl] = useState('');
  const [fetchingOgp, setFetchingOgp] = useState(false);
  const [ogpData, setOgpData] = useState<{
    title: string;
    description: string;
    ogp_image_url: string;
  } | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await fetch('/api/registered-links');
      const data = await res.json();
      if (data.links) {
        setLinks(data.links);
      }
    } catch (e) {
      console.error(e);
      setMessage({ text: 'データの読み込みに失敗しました', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchOgp = async () => {
    if (!newUrl.trim()) {
      setMessage({ text: 'URLを入力してください', type: 'error' });
      return;
    }

    setFetchingOgp(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/fetch-ogp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'OGP取得に失敗しました');
      }

      setOgpData({
        title: data.title || '',
        description: data.description || '',
        ogp_image_url: data.ogp_image_url || '',
      });

      setMessage({ text: 'OGP情報を取得しました', type: 'success' });
    } catch (e: any) {
      console.error(e);
      setMessage({ text: e.message || 'OGP取得に失敗しました', type: 'error' });
    } finally {
      setFetchingOgp(false);
    }
  };

  const handleSave = async () => {
    if (!ogpData) {
      setMessage({ text: 'まずOGP情報を取得してください', type: 'error' });
      return;
    }

    try {
      const res = await fetch('/api/registered-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl,
          ...ogpData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '保存に失敗しました');
      }

      setMessage({ text: '✅ 保存しました！', type: 'success' });
      setNewUrl('');
      setOgpData(null);
      fetchLinks();
    } catch (e: any) {
      console.error(e);
      setMessage({ text: e.message || '保存に失敗しました', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;

    try {
      const res = await fetch(`/api/registered-links?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('削除に失敗しました');
      }

      setMessage({ text: '削除しました', type: 'success' });
      fetchLinks();
    } catch (e: any) {
      console.error(e);
      setMessage({ text: e.message || '削除に失敗しました', type: 'error' });
    }
  };

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">リンク管理画面</h1>

        {message.text && (
          <div className={`mb-6 p-4 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* 新規登録セクション */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">新規リンク登録</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleFetchOgp}
                  disabled={fetchingOgp}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {fetchingOgp ? '取得中...' : 'OGP取得'}
                </button>
              </div>
            </div>

            {ogpData && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-700 mb-3">取得したOGP情報</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">タイトル</label>
                      <input
                        type="text"
                        value={ogpData.title}
                        onChange={(e) => setOgpData({ ...ogpData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">説明文</label>
                      <textarea
                        value={ogpData.description}
                        onChange={(e) => setOgpData({ ...ogpData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">OGP画像</label>
                    {ogpData.ogp_image_url ? (
                      <img 
                        src={ogpData.ogp_image_url} 
                        alt="OGP" 
                        className="w-full h-40 object-cover rounded-md border"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div className="w-full h-40 bg-gray-200 rounded-md flex items-center justify-center text-gray-400">
                        画像なし
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="mt-4 w-full py-3 bg-green-600 text-white rounded-md font-bold hover:bg-green-700 transition"
                >
                  この内容で保存
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 登録済みリンク一覧 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">登録済みリンク ({links.length}件)</h2>

          {links.length === 0 ? (
            <p className="text-gray-500 text-center py-8">登録されているリンクはありません</p>
          ) : (
            <div className="grid gap-4">
              {links.map((link) => (
                <div key={link.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex gap-4">
                    {link.ogp_image_url && (
                      <img 
                        src={link.ogp_image_url} 
                        alt={link.title}
                        className="w-32 h-32 object-cover rounded-md"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">{link.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{link.description}</p>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {link.url}
                      </a>
                    </div>

                    <button
                      onClick={() => handleDelete(link.id)}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition h-fit"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
