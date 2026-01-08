// /app/sns/page.tsx ver.1
"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

type Platform = "x" | "instagram" | "story" | "threads";

type GeneratedContent = {
  x: string;
  instagram: string;
  story: string;
  threads: string;
};

type GeneratedImages = {
  x: string;
  instagram: string;
  story: string;
  threads: string;
};

const PLATFORMS: { id: Platform; name: string; aspectRatio: string; maxChars: number }[] = [
  { id: "x", name: "X（Twitter）", aspectRatio: "16:9", maxChars: 400 },
  { id: "instagram", name: "Instagram", aspectRatio: "1:1", maxChars: 2200 },
  { id: "story", name: "Instagramストーリー", aspectRatio: "9:16", maxChars: 50 },
  { id: "threads", name: "Threads", aspectRatio: "4:3", maxChars: 500 },
];

export default function SNSPage() {
  const { data: session, status } = useSession();
  
  // 入力状態
  const [originalText, setOriginalText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["x", "instagram", "story", "threads"]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  
  // 出力状態
  const [generatedTexts, setGeneratedTexts] = useState<GeneratedContent | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImages | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 認証チェック
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">SNS投稿最適化ツール</h1>
          <p className="text-gray-600 mb-6">利用するにはGoogleアカウントでログインしてください</p>
          <button
            onClick={() => signIn("google")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  // プラットフォーム選択トグル
  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // 画像アップロード処理
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setUploadedFileName(file.name);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // 画像クロップ（クライアント側、コスト0）
  const cropToAspectRatio = (
    imageDataUrl: string,
    aspectRatio: string
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        // アスペクト比をパース
        const [w, h] = aspectRatio.split(":").map(Number);
        const targetRatio = w / h;
        const imgRatio = img.width / img.height;

        let cropWidth, cropHeight, offsetX, offsetY;

        if (imgRatio > targetRatio) {
          // 横長すぎる → 左右をクロップ
          cropHeight = img.height;
          cropWidth = img.height * targetRatio;
          offsetX = (img.width - cropWidth) / 2;
          offsetY = 0;
        } else {
          // 縦長すぎる → 上下をクロップ
          cropWidth = img.width;
          cropHeight = img.width / targetRatio;
          offsetX = 0;
          offsetY = (img.height - cropHeight) / 2;
        }

        // 出力サイズ設定
        const outputWidth = Math.min(cropWidth, 1200);
        const outputHeight = outputWidth / targetRatio;
        canvas.width = outputWidth;
        canvas.height = outputHeight;

        ctx.drawImage(
          img,
          offsetX, offsetY, cropWidth, cropHeight,
          0, 0, outputWidth, outputHeight
        );

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = imageDataUrl;
    });
  };

  // 生成実行
  const handleGenerate = async () => {
    if (!originalText.trim()) {
      setError("基本文章を入力してください");
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError("出力先SNSを1つ以上選択してください");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. AI文章生成
      const textRes = await fetch("/api/sns/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText,
          platforms: selectedPlatforms,
          linkUrl: linkUrl || undefined,
        }),
      });

      if (!textRes.ok) {
        throw new Error("文章生成に失敗しました");
      }

      const textData = await textRes.json();
      setGeneratedTexts(textData);

      // 2. 画像クロップ（アップロードされている場合）
      if (uploadedImage) {
        const images: GeneratedImages = {
          x: "",
          instagram: "",
          story: "",
          threads: "",
        };

        for (const platform of selectedPlatforms) {
          const platformInfo = PLATFORMS.find(p => p.id === platform)!;
          images[platform] = await cropToAspectRatio(uploadedImage, platformInfo.aspectRatio);
        }

        setGeneratedImages(images);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // クリップボードにコピー
  const copyToClipboard = async (text: string, platform: string) => {
    await navigator.clipboard.writeText(text);
    alert(`${platform}用の文章をコピーしました`);
  };

  // 画像ダウンロード
  const downloadImage = (dataUrl: string, platform: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `sns_${platform}_${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">SNS投稿最適化ツール</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user?.name}</span>
            <a href="/" className="text-sm text-blue-600 hover:underline">AI要約へ</a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 入力エリア */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">📝 基本文章</h2>
              <textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="商品紹介や伝えたい内容を入力してください..."
                className="w-full h-40 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={2000}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {originalText.length} / 2000
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">🔗 リンクURL（任意）</h2>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">※
