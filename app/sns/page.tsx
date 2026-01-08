// /app/sns/page.tsx ver.2
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
  { id: "x", name: "X", aspectRatio: "16:9", maxChars: 400 },
  { id: "instagram", name: "Instagram", aspectRatio: "1:1", maxChars: 2200 },
  { id: "story", name: "IGストーリー", aspectRatio: "9:16", maxChars: 50 },
  { id: "threads", name: "Threads", aspectRatio: "4:3", maxChars: 500 },
];

export default function SNSPage() {
  const { data: session, status } = useSession();
  const [originalText, setOriginalText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["x", "instagram", "story", "threads"]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [generatedTexts, setGeneratedTexts] = useState<GeneratedContent | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImages | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter((p) => p !== platform);
      }
      return [...prev, platform];
    });
  };

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

  const cropToAspectRatio = (imageDataUrl: string, aspectRatio: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imageDataUrl);
          return;
        }
        const parts = aspectRatio.split(":");
        const w = parseInt(parts[0], 10);
        const h = parseInt(parts[1], 10);
        const targetRatio = w / h;
        const imgRatio = img.width / img.height;
        let cropWidth: number;
        let cropHeight: number;
        let offsetX: number;
        let offsetY: number;
        if (imgRatio > targetRatio) {
          cropHeight = img.height;
          cropWidth = img.height * targetRatio;
          offsetX = (img.width - cropWidth) / 2;
          offsetY = 0;
        } else {
          cropWidth = img.width;
          cropHeight = img.width / targetRatio;
          offsetX = 0;
          offsetY = (img.height - cropHeight) / 2;
        }
        const outputWidth = Math.min(cropWidth, 1200);
        const outputHeight = outputWidth / targetRatio;
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        ctx.drawImage(img, offsetX, offsetY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = imageDataUrl;
    });
  };

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
      const textRes = await fetch("/api/sns/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: originalText,
          platforms: selectedPlatforms,
          linkUrl: linkUrl || undefined,
        }),
      });
      if (!textRes.ok) {
        throw new Error("文章生成に失敗しました");
      }
      const textData = await textRes.json();
      setGeneratedTexts(textData);
      if (uploadedImage) {
        const images: GeneratedImages = { x: "", instagram: "", story: "", threads: "" };
        for (const platform of selectedPlatforms) {
          const platformInfo = PLATFORMS.find((p) => p.id === platform);
          if (platformInfo) {
            images[platform] = await cropToAspectRatio(uploadedImage, platformInfo.aspectRatio);
          }
        }
        setGeneratedImages(images);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("エラーが発生しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, platformName: string) => {
    await navigator.clipboard.writeText(text);
    alert(platformName + "用の文章をコピーしました");
  };

  const downloadImage = (dataUrl: string, platformId: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "sns_" + platformId + "_" + Date.now() + ".jpg";
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">基本文章</h2>
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
              <h2 className="text-lg font-semibold mb-4">リンクURL（任意）</h2>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">X、Threadsで使用されます（Instagramはプロフ誘導に変換）</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">画像アップロード</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {uploadedImage ? (
                  <div>
                    <img src={uploadedImage} alt="アップロード画像" className="max-h-48 mx-auto rounded" />
                    <p className="text-sm text-gray-600 mt-2">{uploadedFileName}</p>
                    <button
                      onClick={() => { setUploadedImage(null); setUploadedFileName(""); }}
                      className="text-red-500 text-sm mt-2 hover:underline"
                    >
                      削除
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="text-gray-500">
                      <p className="text-4xl mb-2">📷</p>
                      <p>クリックで画像を選択</p>
                      <p className="text-xs mt-1">JPG, PNG, WebP対応</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">出力先SNS</h2>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={
                      "p-3 rounded-lg border-2 transition text-left " +
                      (selectedPlatforms.includes(platform.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300")
                    }
                  >
                    <div className="font-medium">{platform.name}</div>
                    <div className="text-xs text-gray-500">{platform.aspectRatio} / {platform.maxChars}文字</div>
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
            )}
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? "生成中..." : "投稿を生成する"}
            </button>
          </div>
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">生成結果</h2>
            {!generatedTexts ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <p className="text-4xl mb-4">👈</p>
                <p>左側で入力して「投稿を生成する」を押してください</p>
              </div>
            ) : (
              PLATFORMS.filter((p) => selectedPlatforms.includes(p.id)).map((platform) => (
                <div key={platform.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">{platform.name}</h3>
                    <span className="text-xs text-gray-500">{platform.aspectRatio}</span>
                  </div>
                  <div className="bg-gray-50 rounded p-3 mb-3">
                    <p className="whitespace-pre-wrap text-sm">{generatedTexts[platform.id]}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">
                        {generatedTexts[platform.id]?.length || 0} / {platform.maxChars}文字
                      </span>
                      <button
                        onClick={() => copyToClipboard(generatedTexts[platform.id], platform.name)}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        コピー
                      </button>
                    </div>
                  </div>
                  {generatedImages && generatedImages[platform.id] && (
                    <div className="border rounded p-3">
                      <img src={generatedImages[platform.id]} alt={platform.name + "用画像"} className="w-full rounded" />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => downloadImage(generatedImages[platform.id], platform.id)}
                          className="flex-1 bg-gray-100 text-gray-700 py-2 rounded text-sm hover:bg-gray-200"
                        >
                          画像を保存
                        </button>
                        <button
                          className="flex-1 bg-purple-100 text-purple-700 py-2 rounded text-sm hover:bg-purple-200"
                          onClick={() => alert("アレンジ機能は後で実装")}
                        >
                          アレンジ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
