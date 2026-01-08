// /app/sns/page.tsx ver.3
"use client";

import { useState, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

type Platform = "x" | "instagram" | "story" | "threads";

interface PlatformConfig {
  id: Platform;
  name: string;
  aspectRatio: string;
  description: string;
}

const PLATFORMS: PlatformConfig[] = [
  { id: "x", name: "X", aspectRatio: "16:9", description: "400文字以内" },
  { id: "instagram", name: "Instagram", aspectRatio: "1:1", description: "2,200文字、ハッシュタグ10-15個" },
  { id: "story", name: "IGストーリー", aspectRatio: "9:16", description: "50文字以内" },
  { id: "threads", name: "Threads", aspectRatio: "4:3", description: "500文字以内" },
];

interface GeneratedResult {
  text: string;
  croppedImage?: string;
  arrangedImage?: string;
}

export default function SNSPage() {
  const { data: session, status } = useSession();
  const [originalText, setOriginalText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["x", "instagram", "story", "threads"]);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [results, setResults] = useState<Record<Platform, GeneratedResult>>({
    x: { text: "" },
    instagram: { text: "" },
    story: { text: "" },
    threads: { text: "" },
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [arrangingPlatform, setArrangingPlatform] = useState<Platform | null>(null);
  const [arrangePrompts, setArrangePrompts] = useState<Record<Platform, string>>({
    x: "商品はそのまま維持し、背景を木目調のテーブルに変更してください",
    instagram: "商品はそのまま維持し、背景を白い大理石に変更してください",
    story: "商品はそのまま維持し、背景をカフェ風に変更してください",
    threads: "商品はそのまま維持し、背景をキッチンカウンターに変更してください",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // クロップ関数（Canvas API使用、無料）
  const cropToAspectRatio = (
    imageDataUrl: string,
    targetRatio: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const [ratioW, ratioH] = targetRatio.split(":").map(Number);
        const targetAspect = ratioW / ratioH;
        const sourceAspect = img.width / img.height;

        let cropWidth: number;
        let cropHeight: number;
        let offsetX: number;
        let offsetY: number;

        if (sourceAspect > targetAspect) {
          cropHeight = img.height;
          cropWidth = img.height * targetAspect;
          offsetX = (img.width - cropWidth) / 2;
          offsetY = 0;
        } else {
          cropWidth = img.width;
          cropHeight = img.width / targetAspect;
          offsetX = 0;
          offsetY = (img.height - cropHeight) / 2;
        }

        const canvas = document.createElement("canvas");
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / cropWidth);
        canvas.width = cropWidth * scale;
        canvas.height = cropHeight * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        ctx.drawImage(
          img,
          offsetX,
          offsetY,
          cropWidth,
          cropHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.src = imageDataUrl;
    });
  };

  // 画像アップロード処理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setOriginalImage(dataUrl);

      // 各プラットフォーム用にクロップ
      const newResults = { ...results };
      for (const platform of PLATFORMS) {
        try {
          const cropped = await cropToAspectRatio(dataUrl, platform.aspectRatio);
          newResults[platform.id] = {
            ...newResults[platform.id],
            croppedImage: cropped,
            arrangedImage: undefined,
          };
        } catch (err) {
          console.error(`Error cropping for ${platform.id}:`, err);
        }
      }
      setResults(newResults);
    };
    reader.readAsDataURL(file);
  };

  // 文章生成
  const handleGenerate = async () => {
    if (!originalText.trim()) {
      alert("基本文章を入力してください");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/sns/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText,
          platforms: selectedPlatforms,
          linkUrl: linkUrl || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("文章生成に失敗しました");
      }

      const data = await response.json();

      // 結果を更新（画像は保持）
      const newResults = { ...results };
      for (const platform of selectedPlatforms) {
        newResults[platform] = {
          ...newResults[platform],
          text: data[platform] || "",
        };
      }
      setResults(newResults);
    } catch (error) {
      console.error("Generate error:", error);
      alert("文章生成中にエラーが発生しました");
    } finally {
      setIsGenerating(false);
    }
  };

  // 画像アレンジ（AI使用、有料）
  const handleArrangeImage = async (platform: Platform) => {
    const croppedImage = results[platform].croppedImage;
    if (!croppedImage) {
      alert("先に画像をアップロードしてください");
      return;
    }

    const prompt = arrangePrompts[platform];
    if (!prompt.trim()) {
      alert("プロンプトを入力してください");
      return;
    }

    const confirmed = confirm(
      `画像アレンジを実行しますか？\n\n` +
      `プロンプト: ${prompt}\n\n` +
      `※ 約6円/回のAPI料金が発生します`
    );

    if (!confirmed) return;

    setArrangingPlatform(platform);

    try {
      const response = await fetch("/api/sns/arrange-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: croppedImage,
          prompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "画像編集に失敗しました");
      }

      const data = await response.json();

      if (data.success && data.imageBase64) {
        setResults((prev) => ({
          ...prev,
          [platform]: {
            ...prev[platform],
            arrangedImage: data.imageBase64,
          },
        }));
      } else {
        throw new Error("画像が生成されませんでした");
      }
    } catch (error) {
      console.error("Arrange error:", error);
      alert(error instanceof Error ? error.message : "画像編集中にエラーが発生しました");
    } finally {
      setArrangingPlatform(null);
    }
  };

  // クリア機能
  const handleClear = () => {
    const confirmed = confirm("入力内容と生成結果をすべてクリアしますか？");
    if (!confirmed) return;

    setOriginalText("");
    setLinkUrl("");
    setOriginalImage(null);
    setResults({
      x: { text: "" },
      instagram: { text: "" },
      story: { text: "" },
      threads: { text: "" },
    });
    setArrangePrompts({
      x: "商品はそのまま維持し、背景を木目調のテーブルに変更してください",
      instagram: "商品はそのまま維持し、背景を白い大理石に変更してください",
      story: "商品はそのまま維持し、背景をカフェ風に変更してください",
      threads: "商品はそのまま維持し、背景をキッチンカウンターに変更してください",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // コピー機能
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("コピーしました");
  };

  // 画像ダウンロード
  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  // ログイン画面
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">SNS投稿最適化ツール</h1>
        <p className="text-gray-600">ログインして利用を開始してください</p>
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Googleでログイン
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">SNS投稿最適化ツール</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* 入力エリア */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">入力</h2>
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              🗑️ クリア
            </button>
          </div>

          {/* 基本文章 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">基本文章</label>
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="投稿したい内容を入力してください..."
              className="w-full h-32 px-3 py-2 border rounded-lg resize-none"
            />
          </div>

          {/* リンクURL */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">リンクURL（任意）</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* 画像アップロード */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">画像（任意）</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full"
            />
            {originalImage && (
              <div className="mt-2">
                <img
                  src={originalImage}
                  alt="アップロード画像"
                  className="max-h-40 rounded"
                />
              </div>
            )}
          </div>

          {/* プラットフォーム選択 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">対象プラットフォーム</label>
            <div className="flex flex-wrap gap-4">
              {PLATFORMS.map((platform) => (
                <label key={platform.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlatforms([...selectedPlatforms, platform.id]);
                      } else {
                        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform.id));
                      }
                    }}
                  />
                  <span>{platform.name}</span>
                  <span className="text-xs text-gray-500">({platform.aspectRatio})</span>
                </label>
              ))}
            </div>
          </div>

          {/* 生成ボタン */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !originalText.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isGenerating ? "生成中..." : "投稿を生成する"}
          </button>
        </div>

        {/* 結果エリア */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLATFORMS.filter((p) => selectedPlatforms.includes(p.id)).map((platform) => (
            <div key={platform.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {platform.name}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({platform.aspectRatio})
                  </span>
                </h3>
                <span className="text-xs text-gray-500">{platform.description}</span>
              </div>

              {/* 文章 */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">文章</span>
                  {results[platform.id].text && (
                    <button
                      onClick={() => copyToClipboard(results[platform.id].text)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      📋 コピー
                    </button>
                  )}
                </div>
                <div className="bg-gray-50 rounded p-3 min-h-24 text-sm whitespace-pre-wrap">
                  {results[platform.id].text || "（生成後に表示されます）"}
                </div>
              </div>

              {/* 画像 */}
              {(results[platform.id].croppedImage || results[platform.id].arrangedImage) && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      画像
                      {results[platform.id].arrangedImage && (
                        <span className="ml-2 text-xs text-green-600">（アレンジ済み）</span>
                      )}
                    </span>
                    <button
                      onClick={() =>
                        downloadImage(
                          results[platform.id].arrangedImage || results[platform.id].croppedImage!,
                          `${platform.id}_${Date.now()}.jpg`
                        )
                      }
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      💾 保存
                    </button>
                  </div>
                  <img
                    src={results[platform.id].arrangedImage || results[platform.id].croppedImage}
                    alt={`${platform.name}用画像`}
                    className="w-full rounded"
                  />
                </div>
              )}

              {/* アレンジ機能 */}
              {results[platform.id].croppedImage && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">画像アレンジ（AI）</span>
                    <span className="text-xs text-orange-600">※約6円/回</span>
                  </div>
                  <textarea
                    value={arrangePrompts[platform.id]}
                    onChange={(e) =>
                      setArrangePrompts((prev) => ({
                        ...prev,
                        [platform.id]: e.target.value,
                      }))
                    }
                    placeholder="編集指示を入力..."
                    className="w-full h-20 px-3 py-2 border rounded-lg resize-none text-sm mb-2"
                  />
                  <button
                    onClick={() => handleArrangeImage(platform.id)}
                    disabled={arrangingPlatform !== null}
                    className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm"
                  >
                    {arrangingPlatform === platform.id ? "アレンジ中..." : "🎨 アレンジ実行"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
