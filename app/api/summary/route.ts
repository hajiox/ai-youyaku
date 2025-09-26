// /app/api/summary/route.ts ver.8 - Gemini 2025年最新版

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
 * Gemini APIを呼び出す関数（2025年9月版）
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY環境変数が設定されていません");
  }

  // 2025年9月時点で利用可能なモデル（優先順位順）
  const availableModels = [
    'gemini-2.5-flash',      // 最新・推奨（高速・バランス型）
    'gemini-2.5-flash-lite', // 軽量版（コスト最適化）
    'gemini-2.0-flash',      // 安定版（100万トークンコンテキスト）
    'gemini-1.5-flash',      // 旧バージョン（2025年9月24日廃止予定）
  ];

  let lastError: any = null;

  // 各モデルを順番に試す
  for (const modelName of availableModels) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    console.log(`Trying Gemini model: ${modelName}`);

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
        topP: 0.95,  // topKは削除（Gemini 1.0 Pro Vision以降では使用不可）
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

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // x-goog-api-keyヘッダーは不要（URLパラメータで認証）
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        if (text) {
          console.log(`Success with Gemini model: ${modelName}`);
          return text.trim();
        }
      } else {
        const errorText = await response.text();
        console.error(`Failed with model ${modelName}:`, response.status, errorText);
        lastError = { status: response.status, message: errorText, model: modelName };
        
        // レート制限エラーの場合は待機
        if (response.status === 429) {
          console.log('Rate limit hit, waiting 60 seconds...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          continue;
        }
        
        // 400番台エラー（認証エラーなど）の場合は即座に終了
        if (response.status >= 400 && response.status < 500 && response.status !== 404) {
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(`Gemini API認証エラー: ${errorData.error?.message || 'APIキーが無効です'}`);
          } catch (e) {
            if (e instanceof Error && e.message.includes('API認証エラー')) {
              throw e;
            }
            throw new Error(`Gemini APIエラー (${response.status}): ${errorText}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error with model ${modelName}:`, error);
      
      // 認証エラーは即座に再throw
      if (error instanceof Error && error.message.includes('API認証エラー')) {
        throw error;
      }
      
      lastError = error;
      // 他のモデルを試す
      continue;
    }
  }

  // すべてのモデルで失敗した場合
  const errorMessage = lastError?.message || JSON.stringify(lastError) || 'Unknown error';
  throw new Error(`すべてのGeminiモデルで失敗しました。最後のエラー: ${errorMessage}

考えられる原因:
1. APIキーが無効または期限切れ
2. 無料枠の制限に達した（1日の制限を確認してください）
3. Google AI StudioでAPIキーを再生成してください

利用可能なモデル一覧を確認するには:
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"`);
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
      model: 'gemini' // デバッグ用
    });
    
  } catch (err) {
    console.error("Gemini APIハンドラエラー:", err);
    
    // エラーメッセージを改善
    let errorMessage = "サーバー内部エラーが発生しました。";
    let details = "";
    
    if (err instanceof Error) {
      if (err.message.includes('API認証エラー')) {
        errorMessage = "Gemini API認証エラー";
        details = "APIキーが無効です。Google AI Studioで新しいAPIキーを生成してください。";
      } else if (err.message.includes('すべてのGeminiモデルで失敗')) {
        errorMessage = "Gemini API接続エラー";
        details = err.message;
      } else {
        details = err.message;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: details,
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
      model: 'gemini'
    });
    
  } catch (err) {
    console.error("Gemini APIハンドラエラー:", err);
    
    let errorMessage = 'サーバー内部エラーが発生しました。';
    let details = '';
    
    if (err instanceof Error) {
      if (err.message.includes('API認証エラー')) {
        errorMessage = "Gemini API認証エラー";
        details = "APIキーが無効です。Google AI Studioで新しいAPIキーを生成してください。";
      } else if (err.message.includes('すべてのGeminiモデルで失敗')) {
        errorMessage = "Gemini API接続エラー";
        details = err.message;
      } else {
        details = err.message;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: details,
        truncated: false,
        originalLength: 0,
        processedLength: 0
      },
      { status: 500 }
    );
  }
}
