// /app/sns/page.tsx ver.5
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Download, Loader2, RotateCcw, UploadCloud } from "lucide-react";

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
}

type ActiveTool = "optimizer" | "converter";
type OutputFormat = "image/jpeg" | "image/png" | "image/webp";
type ResizeMode = "contain" | "cover" | "stretch";
type DimensionUnit = "px" | "%";
type SizeUnit = "kb" | "%";
type ConvertSource = "file" | "drop" | "paste";

interface ConvertedImage {
  dataUrl: string;
  filename: string;
  mimeType: OutputFormat;
  width: number;
  height: number;
  sizeBytes: number;
  maxSizeBytes: number;
  quality: number;
  originalName: string;
  originalWidth: number;
  originalHeight: number;
  originalSizeBytes: number;
}

interface SavedConverterSetting {
  id: string;
  name: string;
  width: number;
  widthUnit: DimensionUnit;
  height: number;
  heightUnit: DimensionUnit;
  maxSize: number;
  maxSizeUnit: SizeUnit;
  format: OutputFormat;
  mode: ResizeMode;
  background: string;
}

const SAVED_SETTINGS_KEY = "sns-image-converter-settings";

const FORMAT_OPTIONS: { value: OutputFormat; label: string; extension: string }[] = [
  { value: "image/jpeg", label: "JPEG", extension: "jpg" },
  { value: "image/webp", label: "WebP", extension: "webp" },
  { value: "image/png", label: "PNG", extension: "png" },
];

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const dataUrlToBytes = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
};

const sanitizeFilenamePart = (value: string) => {
  return value
    .replace(/\.[^.]+$/, "")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    || "image";
};

const formatSerial = (index: number) => String(index + 1).padStart(3, "0");

const buildConvertedFilename = (
  file: File,
  source: ConvertSource,
  width: number,
  height: number,
  extension: string,
  index: number
) => {
  const sizePart = `${width}x${height}`;
  const serial = formatSerial(index);

  if (source === "file") {
    return `${sanitizeFilenamePart(file.name)}_${sizePart}_${serial}.${extension}`;
  }

  return `${sizePart}_${serial}.${extension}`;
};

const resolveDimension = (value: number, unit: DimensionUnit, originalValue: number) => {
  if (unit === "%") return Math.max(1, Math.round((originalValue * value) / 100));
  return Math.max(1, Math.round(value));
};

const resolveMaxSizeBytes = (value: number, unit: SizeUnit, originalBytes: number) => {
  if (unit === "%") return Math.max(1, Math.round((originalBytes * value) / 100));
  return Math.max(1, Math.round(value * 1024));
};

const loadImageFromFile = (file: File): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
};

const convertImageFile = async (
  file: File,
  options: {
    width: number;
    widthUnit: DimensionUnit;
    height: number;
    heightUnit: DimensionUnit;
    maxSize: number;
    maxSizeUnit: SizeUnit;
    format: OutputFormat;
    mode: ResizeMode;
    background: string;
    source: ConvertSource;
    serialIndex: number;
  }
): Promise<ConvertedImage> => {
  const source = await loadImageFromFile(file);
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("画像の描画に失敗しました"));
    img.src = source.dataUrl;
  });

  const targetWidth = resolveDimension(options.width, options.widthUnit, source.width);
  const targetHeight = resolveDimension(options.height, options.heightUnit, source.height);
  const maxSizeBytes = resolveMaxSizeBytes(options.maxSize, options.maxSizeUnit, file.size);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvasを利用できません");

  ctx.fillStyle = options.background || "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sourceRatio = source.width / source.height;
  const targetRatio = targetWidth / targetHeight;

  let drawWidth = targetWidth;
  let drawHeight = targetHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (options.mode !== "stretch") {
    const shouldFitWidth =
      options.mode === "contain" ? sourceRatio > targetRatio : sourceRatio < targetRatio;

    if (shouldFitWidth) {
      drawWidth = targetWidth;
      drawHeight = targetWidth / sourceRatio;
    } else {
      drawHeight = targetHeight;
      drawWidth = targetHeight * sourceRatio;
    }

    offsetX = (targetWidth - drawWidth) / 2;
    offsetY = (targetHeight - drawHeight) / 2;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

  let quality = options.format === "image/png" ? 1 : 0.92;
  let dataUrl = canvas.toDataURL(options.format, quality);

  if (options.format !== "image/png") {
    while (dataUrlToBytes(dataUrl) > maxSizeBytes && quality > 0.14) {
      quality = Math.max(0.12, quality - 0.06);
      dataUrl = canvas.toDataURL(options.format, quality);
    }
  }

  const selectedFormat = FORMAT_OPTIONS.find((format) => format.value === options.format) || FORMAT_OPTIONS[0];

  return {
    dataUrl,
    filename: buildConvertedFilename(file, options.source, targetWidth, targetHeight, selectedFormat.extension, options.serialIndex),
    mimeType: options.format,
    width: targetWidth,
    height: targetHeight,
    sizeBytes: dataUrlToBytes(dataUrl),
    maxSizeBytes,
    quality,
    originalName: file.name,
    originalWidth: source.width,
    originalHeight: source.height,
    originalSizeBytes: file.size,
  };
};

export default function SNSPage() {
  const { data: session, status } = useSession();
  const [activeTool, setActiveTool] = useState<ActiveTool>("optimizer");
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const converterInputRef = useRef<HTMLInputElement>(null);
  const [convertWidth, setConvertWidth] = useState(1200);
  const [convertWidthUnit, setConvertWidthUnit] = useState<DimensionUnit>("px");
  const [convertHeight, setConvertHeight] = useState(630);
  const [convertHeightUnit, setConvertHeightUnit] = useState<DimensionUnit>("px");
  const [maxSize, setMaxSize] = useState(500);
  const [maxSizeUnit, setMaxSizeUnit] = useState<SizeUnit>("kb");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("image/jpeg");
  const [resizeMode, setResizeMode] = useState<ResizeMode>("contain");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [convertedImages, setConvertedImages] = useState<ConvertedImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [converterError, setConverterError] = useState("");
  const [settingName, setSettingName] = useState("");
  const [savedSettings, setSavedSettings] = useState<SavedConverterSetting[]>([]);

  const targetSummary = useMemo(
    () => `${convertWidth}${convertWidthUnit} x ${convertHeight}${convertHeightUnit} / ${maxSize}${maxSizeUnit === "kb" ? "KB" : "%"}以内`,
    [convertWidth, convertWidthUnit, convertHeight, convertHeightUnit, maxSize, maxSizeUnit]
  );

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

  const handleConvertFiles = async (fileList: FileList | File[], source: ConvertSource) => {
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (!files.length) {
      setConverterError("画像ファイルを選択してください");
      return;
    }

    setIsConverting(true);
    setBatchDone(0);
    setBatchTotal(files.length);
    setConverterError("");

    try {
      for (let index = 0; index < files.length; index += 1) {
        const converted = await convertImageFile(files[index], {
            width: convertWidth,
            widthUnit: convertWidthUnit,
            height: convertHeight,
            heightUnit: convertHeightUnit,
            maxSize,
            maxSizeUnit,
            format: outputFormat,
            mode: resizeMode,
            background: backgroundColor,
            source,
            serialIndex: index,
          });

        downloadImage(converted.dataUrl, converted.filename);
        setConvertedImages((current) => [converted, ...current]);
        setBatchDone(index + 1);

        if (index < files.length - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 350));
        }
      }
    } catch (error) {
      console.error("Convert error:", error);
      setConverterError(error instanceof Error ? error.message : "画像変換中にエラーが発生しました");
    } finally {
      setIsConverting(false);
      setBatchDone(0);
      setBatchTotal(0);
    }
  };

  const handleConverterInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) handleConvertFiles(files, "file");
  };

  const handlePasteImages = (clipboardData: DataTransfer) => {
    const files = Array.from(clipboardData.files).filter((file) => file.type.startsWith("image/"));

    if (files.length > 0) {
      handleConvertFiles(files, "paste");
      return true;
    }

    const itemFiles = Array.from(clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (itemFiles.length > 0) {
      handleConvertFiles(itemFiles, "paste");
      return true;
    }

    return false;
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleConvertFiles(event.dataTransfer.files, "drop");
  };

  const applySavedSetting = (setting: SavedConverterSetting) => {
    setConvertWidth(setting.width);
    setConvertWidthUnit(setting.widthUnit);
    setConvertHeight(setting.height);
    setConvertHeightUnit(setting.heightUnit);
    setMaxSize(setting.maxSize);
    setMaxSizeUnit(setting.maxSizeUnit);
    setOutputFormat(setting.format);
    setResizeMode(setting.mode);
    setBackgroundColor(setting.background);
  };

  const saveCurrentSetting = () => {
    const name = settingName.trim();
    if (!name) {
      alert("設定名を入力してください");
      return;
    }

    const setting: SavedConverterSetting = {
      id: `${Date.now()}`,
      name,
      width: convertWidth,
      widthUnit: convertWidthUnit,
      height: convertHeight,
      heightUnit: convertHeightUnit,
      maxSize,
      maxSizeUnit,
      format: outputFormat,
      mode: resizeMode,
      background: backgroundColor,
    };

    setSavedSettings((current) => {
      const next = [setting, ...current.filter((item) => item.name !== name)];
      localStorage.setItem(SAVED_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
    setSettingName("");
  };

  const deleteSavedSetting = (id: string) => {
    setSavedSettings((current) => {
      const next = current.filter((item) => item.id !== id);
      localStorage.setItem(SAVED_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_SETTINGS_KEY);
      if (stored) setSavedSettings(JSON.parse(stored));
    } catch (error) {
      console.error("Saved settings load error:", error);
    }
  }, []);

  useEffect(() => {
    if (activeTool !== "converter") return;

    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      const isTextInput =
        tagName === "input" || tagName === "textarea" || target?.isContentEditable;

      if (isTextInput) return;
      if (!event.clipboardData) return;

      const handled = handlePasteImages(event.clipboardData);
      if (handled) event.preventDefault();
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [activeTool, convertWidth, convertWidthUnit, convertHeight, convertHeightUnit, maxSize, maxSizeUnit, outputFormat, resizeMode, backgroundColor]);

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
          <h1 className="text-2xl font-bold">
            {activeTool === "converter" ? "画像変換ツール" : "SNS投稿最適化ツール"}
          </h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === "converter" ? "optimizer" : "converter")}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {activeTool === "converter" ? "SNS投稿最適化へ" : "画像変換へ"}
            </button>
            <span className="text-sm text-gray-600">{session.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ログアウト
            </button>
          </div>
        </div>

        {activeTool === "converter" && (
          <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium">現在の設定を保存</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settingName}
                    onChange={(event) => setSettingName(event.target.value)}
                    placeholder="例: 楽天商品画像"
                    className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={saveCurrentSetting}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {targetSummary} / {FORMAT_OPTIONS.find((format) => format.value === outputFormat)?.label}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {savedSettings.length === 0 ? (
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-500">
                  保存済み設定はまだありません
                </span>
              ) : (
                savedSettings.map((setting) => (
                  <div key={setting.id} className="flex items-center overflow-hidden rounded-full border bg-gray-50 text-sm">
                    <button
                      type="button"
                      onClick={() => applySavedSetting(setting)}
                      className="px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {setting.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSavedSetting(setting.id)}
                      className="border-l px-2 py-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`${setting.name}を削除`}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTool === "optimizer" ? (
          <>
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
              {results[platform.id].croppedImage && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">画像</span>
                    <button
                      onClick={() =>
                        downloadImage(
                          results[platform.id].croppedImage!,
                          `${platform.id}_${Date.now()}.jpg`
                        )
                      }
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      💾 保存
                    </button>
                  </div>
                  <img
                    src={results[platform.id].croppedImage}
                    alt={`${platform.name}用画像`}
                    className="w-full rounded"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            <div className="bg-white rounded-lg shadow p-6 h-fit">
              <h2 className="text-lg font-semibold mb-4">変換設定</h2>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">幅</label>
                  <div className="flex">
                    <input
                      type="number"
                      min={1}
                      value={convertWidth}
                      onChange={(event) => setConvertWidth(Number(event.target.value) || 1)}
                      className="min-w-0 flex-1 rounded-l-lg border border-r-0 px-3 py-2"
                    />
                    <select
                      value={convertWidthUnit}
                      onChange={(event) => setConvertWidthUnit(event.target.value as DimensionUnit)}
                      className="rounded-r-lg border bg-white px-2 py-2"
                    >
                      <option value="px">px</option>
                      <option value="%">%</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">高さ</label>
                  <div className="flex">
                    <input
                      type="number"
                      min={1}
                      value={convertHeight}
                      onChange={(event) => setConvertHeight(Number(event.target.value) || 1)}
                      className="min-w-0 flex-1 rounded-l-lg border border-r-0 px-3 py-2"
                    />
                    <select
                      value={convertHeightUnit}
                      onChange={(event) => setConvertHeightUnit(event.target.value as DimensionUnit)}
                      className="rounded-r-lg border bg-white px-2 py-2"
                    >
                      <option value="px">px</option>
                      <option value="%">%</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">上限容量</label>
                <div className="flex">
                  <input
                    type="number"
                    min={1}
                    value={maxSize}
                    onChange={(event) => setMaxSize(Number(event.target.value) || 1)}
                    className="min-w-0 flex-1 rounded-l-lg border border-r-0 px-3 py-2"
                  />
                  <select
                    value={maxSizeUnit}
                    onChange={(event) => setMaxSizeUnit(event.target.value as SizeUnit)}
                    className="rounded-r-lg border bg-white px-2 py-2"
                  >
                    <option value="kb">KB</option>
                    <option value="%">%</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">出力形式</label>
                <select
                  value={outputFormat}
                  onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  {FORMAT_OPTIONS.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">変形方法</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "contain", label: "余白" },
                    { value: "cover", label: "切抜き" },
                    { value: "stretch", label: "引伸し" },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setResizeMode(mode.value as ResizeMode)}
                      className={`rounded-lg border px-2 py-2 text-sm ${
                        resizeMode === mode.value
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {resizeMode === "contain" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">余白色</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(event) => setBackgroundColor(event.target.value)}
                      className="h-10 w-14 rounded border"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(event) => setBackgroundColor(event.target.value)}
                      className="min-w-0 flex-1 rounded-lg border px-3 py-2"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setConvertedImages([]);
                  setConverterError("");
                  if (converterInputRef.current) converterInputRef.current.value = "";
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
              >
                <RotateCcw className="h-4 w-4" />
                クリア
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div
                  onDrop={handleDrop}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition ${
                    isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                  }`}
                  onClick={() => converterInputRef.current?.click()}
                >
                  {isConverting ? (
                    <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-600" />
                  ) : (
                    <UploadCloud className="mb-4 h-10 w-10 text-blue-600" />
                  )}
                  <p className="text-lg font-semibold">
                    {isConverting && batchTotal > 1
                      ? `${batchDone + 1 > batchTotal ? batchTotal : batchDone + 1}/${batchTotal} 処理中`
                      : "画像をドロップ / ペースト"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{targetSummary} に変換して自動ダウンロードします</p>
                  <p className="mt-3 text-xs text-gray-400">複数ファイルは1枚ずつ変換して、ZIP化せず個別にダウンロードします。</p>
                  <input
                    ref={converterInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleConverterInput}
                    className="hidden"
                  />
                </div>

                {converterError && (
                  <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {converterError}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">実行結果</h2>
                  <span className="text-sm text-gray-500">{convertedImages.length}件</span>
                </div>

                {convertedImages.length === 0 ? (
                  <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                    変換を実行すると、ダウンロード結果がここに残ります。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {convertedImages.map((image, index) => {
                    const isOverLimit = image.sizeBytes > image.maxSizeBytes;

                    return (
                      <div
                        key={`${image.originalName}-${image.filename}-${index}`}
                        className="grid gap-3 rounded-lg border border-gray-200 p-4 text-sm md:grid-cols-[1fr_auto]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                              ダウンロード実行済み
                            </span>
                            {isOverLimit && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                                上限超過
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 truncate font-semibold">{image.filename}</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            元: {image.originalName} ({image.originalWidth}x{image.originalHeight} / {formatBytes(image.originalSizeBytes)})
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:min-w-[280px]">
                          <div className="rounded-lg bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">変換後</div>
                            <div className="font-medium">{image.width}x{image.height}px</div>
                          </div>
                          <div className={`rounded-lg p-3 ${isOverLimit ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                            <div className="text-xs opacity-75">容量</div>
                            <div className="font-medium">{formatBytes(image.sizeBytes)}</div>
                            <div className="text-[11px] opacity-75">上限 {formatBytes(image.maxSizeBytes)}</div>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">形式</div>
                            <div className="font-medium">{FORMAT_OPTIONS.find((format) => format.value === image.mimeType)?.label}</div>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">品質</div>
                            <div className="font-medium">{Math.round(image.quality * 100)}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
