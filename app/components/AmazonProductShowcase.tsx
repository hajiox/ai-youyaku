// app/page.tsx ver.2

"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import AmazonProductShowcase, {
  AmazonProduct as AmazonProductType,
} from "./components/AmazonProductShowcase";
import ToneSampleModal from "./components/ToneSampleModal";

const FREE_USER_TONE_SAMPLE_MAX_LENGTH = 2000;

export default function Home() {
  const [url, setUrl] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [longSummary, setLongSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedInfo, setProcessedInfo] = useState<{truncated: boolean, originalLength: number, processedLength: number} | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const { data: session, status } = useSession();

  const [showToneSampleModal, setShowToneSampleModal] = useState(false);
  const [currentDbSample, setCurrentDbSample] = useState("");
  const [isSavingToneSample, setIsSavingToneSample] = useState(false);
  const [toneSampleError, setToneSampleError] = useState<string | null>(null);
  const [toneSampleSuccessMessage, setToneSampleSuccessMessage] = useState<string | null>(null);
  const [amazonKeywords, setAmazonKeywords] = useState<string[]>([]);
  const [amazonProducts, setAmazonProducts] = useState<AmazonProductType[]>([]);
  const [amazonProductsLoading, setAmazonProductsLoading] = useState(false);
  const [amazonProductsError, setAmazonProductsError] = useState<string | null>(
    null
  );

  const extractKeywords = (text: string, max: number = 3): string[] => {
    const tokens = text.match(/[\p{Script=Han}々]+|[ァ-ヶー]+|[a-zA-Z]+/gu) || [];
    const freq: Record<string, number> = {};
    tokens.forEach((t) => {
      if (t.length < 2) return;
      freq[t] = (freq[t] || 0) + 1;
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([w]) => w);
  };

  const handleSummarize = async (
    selectedTone: "casual" | "formal" | "custom"
  ) => {
    if (!url) {
      alert("URLを入力してください");
      return;
    }
    if (isLoading) return;

    if (selectedTone === "custom" && !currentDbSample) {
      alert("自分の口調サンプルが登録されていません。");
      return;
    }

    setIsLoading(true);
    setError(null);
    setShortSummary("");
    setLongSummary("");
    setProcessedInfo(null);

    try {
      const requests = selectedTone === "custom"
        ? [
            fetch('/api/summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, mode: 'short', tone: 'custom', toneSample: currentDbSample })
            }),
            fetch('/api/summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, mode: 'long', tone: 'custom', toneSample: currentDbSample })
            })
          ]
        : [
            fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=short&tone=${selectedTone}`),
            fetch(`/api/summary?url=${encodeURIComponent(url)}&mode=long&tone=${selectedTone}`)
          ];
      const [shortRes, longRes] = await Promise.all(requests);

      let shortError = null;
      let longError = null;
      let shortData:
