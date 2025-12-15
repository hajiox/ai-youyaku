// /app/api/summary/route.ts ver.12 - 3プラットフォーム一括生成版
import { NextResponse } from "next/server";
import { buildMessagesForGemini } from "@/lib/buildMessages";

export const runtime = "edge";

const MAX_INPUT_CHAR_LENGTH = 15000;

// URLからコンテンツを取得する関数
async function fetchUrlContent(url: string): Promise<{ 
  content: string | null, 
  truncated: boolean, 
  originalLength: number, 
  error?: string 
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return { content: null, truncated: false, originalLength: 0, error: `アクセス失敗: ${response.status}` };
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || (!contentType.includes("text/html") && !contentType.includes("text/plain"))) {
       // HTMLでもテキストでもない場合はエラー回避のためテキストとして扱うか、処理をスキップ
    }

    let text = await response.text();
    
    // 簡易的なHTMLタグ除去
    text = text
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gmi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gmi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s\s+/g, ' ')
      .trim();

    const originalLength = text.length;
    let truncated = false;

    if (originalLength > MAX_INPUT_CHAR_LENGTH) {
      text = text.substring(0, MAX_INPUT_CHAR_LENGTH);
      truncated = true;
    }

    if (text.length < 50) {
      return { content: null, truncated: false, originalLength: 0, error: "本文が短すぎるか取得できませんでした" };
    }

    return { content: text, truncated, originalLength };

  } catch (error) {
    console.error("Fetch error:", error);
    return { content: null, truncated: false, originalLength: 0, error: "記事の取得中にエラーが発生しました" };
  }
}

// Gemini API呼び出し関数
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key未設定");

  // モデル名を修正 (gemini-2.5-flash-lite は存在しない可能性が高いため、安定版を使用)
  const modelName = 'gemini-1.5-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        response_mime_type: "application/json", // JSONモードを強制
      }
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Gemini Error:", err);
    throw new Error(`AIエラー: ${response.status}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

// POSTハンドラ
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, tone, toneSample } = body;

    if (!url) {
      return NextResponse.json({ error: 'URLは必須です' }, { status: 400 });
    }

    // 1. 記事取得
    const fetchResult = await fetchUrlContent(url);
    if (fetchResult.error || !fetchResult.content) {
      return NextResponse.json({ error: fetchResult.error }, { status: 500 });
    }

    // 2. プロンプト作成
    let prompt = buildMessagesForGemini(tone, fetchResult.content, toneSample);
    if (fetchResult.truncated) {
      prompt = `（記事が長いため冒頭${MAX_INPUT_CHAR_LENGTH}文字のみ使用）\n${prompt}`;
    }

    // 3. AI生成実行
    const jsonString = await callGeminiAPI(prompt);

    // 4. JSON解析
    let result;
    try {
      // コードブロック記法が含まれている場合の除去処理
      const cleanJson = jsonString.replace(/```json\n|\n```/g, '').trim();
      result = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      return NextResponse.json({ error: "AIの応答形式が不正でした" }, { status: 500 });
    }

    return NextResponse.json({ 
      summary: result, // { twitter, threads, note }
      truncated: fetchResult.truncated
    });

  } catch (err) {
    console.error("Server Error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
