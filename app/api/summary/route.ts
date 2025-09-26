// /app/api/summary/route.ts ver.7 - Gemini版

import { NextResponse } from "next/server";
import { buildMessagesForGemini } from "@/lib/buildMessages";

export const runtime = "edge";

// 入力コンテンツの最大文字数
const MAX_INPUT_CHAR_LENGTH = 5000;

/**
 * URLからコンテンツを取得
 */
async function fetchUrlContent(url: string): Promise<{ 
  content: string | null, 
  truncated: boolean, 
  originalLength: number, 
  processedLength: number, 
  error?: string 
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`URLの取得に失敗: ${url}, ステータス: ${response.status}`);
      return { 
        content: null, 
        truncated: false, 
        originalLength: 0, 
        processedLength: 0, 
        error: `URLの取得に失敗 (ステータス: ${response.status})` 
      };
    }

    const contentType = response.headers.get("content-type");
    let plainText = "";

    if (contentType && contentType.includes("text/html")) {
      const html = await response.text();
      plainText = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s\s+/g, ' ')
        .trim();
    } else if (contentType && contentType.includes("text/plain")) {
      plainText = await response.text();
    } else {
      console.warn(`未対応のコンテンツタイプ: ${contentType} (URL: ${url})`);
      return { 
        content: null, 
        truncated: false, 
        originalLength: 0, 
        processedLength: 0, 
        error: `未対応のコンテンツタイプ: ${contentType}` 
      };
    }

    const originalLength = plainText.length;
    let processedText = plainText;
    let truncated = false;

    if (originalLength === 0) {
      return { 
        content: null, 
        truncated: false, 
        originalLength: 0, 
        processedLength: 0, 
        error: "記事からテキストを抽出できませんでした。" 
      };
    }

    if (originalLength > MAX_INPUT_CHAR_LENGTH) {
      console.log(`記事が長いためトリミング: ${originalLength}文字 -> ${MAX_INPUT_CHAR_LENGTH}文字`);
      processedText = plainText.substring(0, MAX_INPUT_CHAR_LENGTH);
      truncated = true;
    }

    return { 
      content: processedText, 
      truncated, 
      originalLength, 
      processedLength: processedText.length 
    };

  } catch (error) {
    console.error(`URL (${url}) のコンテンツ取得中にエラー:`, error);
    return { 
      content: null, 
      truncated: false, 
      originalLength: 0, 
      processedLength: 0, 
      error: "記事コンテンツの取得中に予期せぬエラーが発生しました。" 
    };
  }
}

/**
 * Gemini APIを呼び出す関数
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  // デバッグ用：APIキーの状態を確認
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY is undefined");
    throw new Error("GEMINI_API_KEY環境変数が設定されていません");
  }
  
  console.log("API Key length:", apiKey.length); // キーの長さを確認（通常39文字）
  console.log("API Key first 10 chars:", apiKey.substring(0, 10)); // 最初の10文字だけログ

  // Gemini Pro（より安定）を試す
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ]
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    
    // エラー内容の詳細を解析
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.error?.code === 404) {
        throw new Error(`APIキーまたはモデル名が無効です。環境変数GEMINI_API_KEYを確認してください。`);
      }
      if (errorData.error?.code === 429) {
        throw new Error(`無料利用枠を超過しました。明日再度お試しください。`);
      }
      throw new Error(`Gemini API error: ${errorData.error?.message || response.status}`);
    } catch {
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
  }

  const data = await response.json();
  
  // Geminiのレスポンス構造から要約テキストを抽出
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  
  if (!text) {
    throw new Error("Geminiからの応答にテキストが含まれていませんでした");
  }

  return text.trim();
}

/**
 * GET リクエストハンドラ
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const urlToSummarize = searchParams.get("url");
  const mode = searchParams.get("mode");
  const tone = searchParams.get("tone") || 'casual';

  if (!urlToSummarize || !mode || (mode !== "short" && mode !== "long")) {
    return NextResponse.json(
      { error: "リクエストが無効です。url と mode (short または long) を指定してください。" },
      { status: 400 }
    );
  }

  if (tone !== 'casual' && tone !== 'formal' && tone !== 'custom') {
    return NextResponse.json(
      { error: "無効なトーンが指定されました。casual、formal、または custom を指定してください。" },
      { status: 400 }
    );
  }

  const fetchResult = await fetchUrlContent(urlToSummarize);

  if (fetchResult.error || !fetchResult.content) {
    return NextResponse.json(
      { 
        error: fetchResult.error || `URL (${urlToSummarize}) からコンテンツを取得できませんでした。`,
        truncated: false,
        originalLength: fetchResult.originalLength,
        processedLength: fetchResult.processedLength
      },
      { status: 500 }
    );
  }

  const webContent = fetchResult.content;
  const targetLengthDescription = mode === "short" ? "200文字程度の短い" : "1000文字程度の詳細な";

  // Gemini用のプロンプト作成
  let prompt = buildMessagesForGemini(tone as any, webContent, targetLengthDescription);
  
  if (fetchResult.truncated) {
    prompt = `注意：以下のテキストは元記事の先頭${MAX_INPUT_CHAR_LENGTH}文字分です（元記事の全長は${fetchResult.originalLength}文字）。\n\n${prompt}`;
  }

  try {
    const summaryText = await callGeminiAPI(prompt);
    
    return NextResponse.json({ 
      result: summaryText,
      truncated: fetchResult.truncated,
      originalLength: fetchResult.originalLength,
      processedLength: fetchResult.processedLength,
      model: 'gemini-1.5-flash' // デバッグ用
    });
    
  } catch (err) {
    console.error("Gemini APIハンドラエラー:", err);
    return NextResponse.json(
      { 
        error: "サーバー内部エラーが発生しました。",
        details: err instanceof Error ? err.message : String(err),
        truncated: false,
        originalLength: 0,
        processedLength: 0
      },
      { status: 500 }
    );
  }
}

/**
 * POST リクエストハンドラ（カスタム口調対応）
 */
export async function POST(req: Request) {
  const { url, mode, tone, toneSample } = await req.json();

  if (!url || !mode || (mode !== 'short' && mode !== 'long')) {
    return NextResponse.json(
      { error: 'リクエストが無効です。url と mode (short または long) を指定してください。' },
      { status: 400 }
    );
  }

  if (tone !== 'casual' && tone !== 'formal' && tone !== 'custom') {
    return NextResponse.json(
      { error: '無効なトーンが指定されました。casual、formal、または custom を指定してください。' },
      { status: 400 }
    );
  }

  if (tone === 'custom' && typeof toneSample !== 'string') {
    return NextResponse.json(
      { error: 'toneSample が必要です。' },
      { status: 400 }
    );
  }

  const fetchResult = await fetchUrlContent(url);

  if (fetchResult.error || !fetchResult.content) {
    return NextResponse.json(
      { 
        error: fetchResult.error || `URL (${url}) からコンテンツを取得できませんでした。`,
        truncated: false,
        originalLength: fetchResult.originalLength,
        processedLength: fetchResult.processedLength
      },
      { status: 500 }
    );
  }

  const webContent = fetchResult.content;
  const targetLengthDescription = mode === 'short' ? '200文字程度の短い' : '1000文字程度の詳細な';

  // Gemini用のプロンプト作成（カスタム口調対応）
  let prompt = buildMessagesForGemini(tone as any, webContent, targetLengthDescription, toneSample);
  
  if (fetchResult.truncated) {
    prompt = `注意：以下のテキストは元記事の先頭${MAX_INPUT_CHAR_LENGTH}文字分です（元記事の全長は${fetchResult.originalLength}文字）。\n\n${prompt}`;
  }

  try {
    const summaryText = await callGeminiAPI(prompt);
    
    return NextResponse.json({ 
      result: summaryText,
      truncated: fetchResult.truncated,
      originalLength: fetchResult.originalLength,
      processedLength: fetchResult.processedLength,
      model: 'gemini-1.5-flash'
    });
    
  } catch (err) {
    console.error("Gemini APIハンドラエラー:", err);
    return NextResponse.json(
      { 
        error: 'サーバー内部エラーが発生しました。',
        details: err instanceof Error ? err.message : String(err),
        truncated: false,
        originalLength: 0,
        processedLength: 0
      },
      { status: 500 }
    );
  }
}
