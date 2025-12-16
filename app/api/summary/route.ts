// /app/api/summary/route.ts ver.21 - モデル変更＆文字数制限解除版
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
    if (contentType && !contentType.includes("text/html") && !contentType.includes("text/plain")) {
       console.log(`Skipping non-text content: ${contentType}`);
    }

    let text = await response.text();
    
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
  if (!apiKey) throw new Error("GEMINI_API_KEY環境変数が設定されていません");

  // 【修正1】モデルを安定版かつ高性能な 2.0-flash-exp に変更
  const modelName = 'gemini-2.0-flash-exp';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  console.log(`Using Gemini model: ${modelName}`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192, // 【修正2】出力文字数制限を大幅に緩和（途切れ防止）
        response_mime_type: "application/json",
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error:`, response.status, errorText);
    
    if (response.status === 404) {
      throw new Error(`モデル (${modelName}) が見つかりません。`);
    }
    if (response.status === 503) {
      throw new Error(`AIサーバーが混雑しています。少し時間を置いて再度お試しください。`);
    }
    if (response.status === 429) {
      throw new Error(`アクセス制限にかかりました。30秒ほど待機してください。`);
    }
    throw new Error(`AIサービスの呼び出しに失敗しました (${response.status})`);
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

    const fetchResult = await fetchUrlContent(url);
    if (fetchResult.error || !fetchResult.content) {
      return NextResponse.json({ error: fetchResult.error }, { status: 500 });
    }

    let prompt = buildMessagesForGemini(tone, fetchResult.content, toneSample);
    if (fetchResult.truncated) {
      prompt = `（記事が長いため冒頭${MAX_INPUT_CHAR_LENGTH}文字のみ使用）\n${prompt}`;
    }

    const jsonString = await callGeminiAPI(prompt);

    // JSON解析（切り出し処理付き）
    let result;
    try {
      const firstOpen = jsonString.indexOf('{');
      const lastClose = jsonString.lastIndexOf('}');
      
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        const cleanJson = jsonString.substring(firstOpen, lastClose + 1);
        result = JSON.parse(cleanJson);
      } else {
        result = JSON.parse(jsonString);
      }
    } catch (e) {
      console.error("JSON Parse Error:", e);
      // 万が一失敗してもログに残してユーザーには分かりやすいエラーを返す
      return NextResponse.json({ error: "要約が長すぎて処理できませんでした。別の記事で試してください。" }, { status: 500 });
    }

    return NextResponse.json({ 
      summary: result, 
      truncated: fetchResult.truncated
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "サーバーエラーが発生しました";
    console.error("Server Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
