// /app/api/summary/route.ts ver.9
import { NextResponse } from "next/server";
import { buildMessagesForGemini } from "@/lib/buildMessages";

export const runtime = "edge";

// 入力コンテンツの最大文字数（Yahooニュースなどは余計な文字も多いので少し増やす）
const MAX_INPUT_CHAR_LENGTH = 15000;

/**
 * URLからコンテンツを取得（人間になりすましてアクセスする）
 */
async function fetchUrlContent(url: string): Promise<{ 
  content: string | null, 
  truncated: boolean, 
  originalLength: number, 
  processedLength: number, 
  error?: string 
}> {
  try {
    // ユーザーエージェントとヘッダーを強化して、普通のPCブラウザに見せかける
    // これがないと「AI出禁」サイトやセキュリティの高いニュースサイトで弾かれます
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
    });

    if (!response.ok) {
      console.error(`URLの取得に失敗: ${url}, ステータス: ${response.status}`);
      // 403 Forbiddenなどはアクセス拒否
      return { 
        content: null, 
        truncated: false, 
        originalLength: 0, 
        processedLength: 0, 
        error: `記事の取得に失敗しました (Status: ${response.status})。サイトがアクセスを拒否している可能性があります。` 
      };
    }

    const contentType = response.headers.get("content-type");
    let plainText = "";

    // HTMLをテキスト化して取り込む処理
    if (contentType && contentType.includes("text/html")) {
      const html = await response.text();
      
      // HTMLから本文抽出の精度を向上（正規表現で不要な部分を削ぎ落とす）
      plainText = html
        // スクリプトとスタイルを削除（最優先）
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gmi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gmi, ' ')
        .replace(//g, ' ') // コメント削除
        // ナビゲーション、フッター、ヘッダー、広告枠などを大まかに削除
        .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gmi, ' ')
        .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gmi, ' ')
        .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gmi, ' ')
        .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gmi, ' ')
        // タグを削除してテキストのみにする
        .replace(/<[^>]+>/g, ' ')
        // HTMLエンティティのデコード（文字化け防止）
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // 空白・改行を整理
        .replace(/\s\s+/g, ' ')
        .trim();
        
    } else if (contentType && contentType.includes("text/plain")) {
      plainText = await response.text();
    } else {
      // JSONなどが返ってきた場合もテキストとして扱う
      plainText = await response.text();
    }

    const originalLength = plainText.length;
    let processedText = plainText;
    let truncated = false;

    // テキスト化の結果、中身がスカスカだった場合
    if (originalLength < 50) {
      return { 
        content: null, 
        truncated: false, 
        originalLength: 0, 
        processedLength: 0, 
        error: "記事の本文を正しく抽出できませんでした（内容が取得できていません）。" 
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
      error: "記事へのアクセス中にネットワークエラーが発生しました。" 
    };
  }
}

/**
 * Gemini APIを呼び出す関数
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY環境変数が設定されていません");
  }

  const modelName = 'gemini-2.5-flash-lite';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  console.log(`Using Gemini model: ${modelName}`);

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error:`, response.status, errorText);
      if (response.status === 429) throw new Error(`AIの利用制限（レートリミット）に達しました。しばらく待ってからお試しください。`);
      throw new Error(`AIサービスの呼び出しに失敗しました (${response.status})`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!text) {
      throw new Error("AIからの応答が空でした。");
    }
    
    return text.trim();

  } catch (error) {
    console.error(`Error with Gemini:`, error);
    throw error;
  }
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
    return NextResponse.json({ error: "パラメータが不足しています" }, { status: 400 });
  }

  // 記事取得
  const fetchResult = await fetchUrlContent(urlToSummarize);

  if (fetchResult.error || !fetchResult.content) {
    return NextResponse.json(
      { 
        error: fetchResult.error,
        summary: null
      },
      { status: 500 }
    );
  }

  const targetLengthDescription = mode === "short" ? "200文字程度の短い" : "1000文字程度の詳細な";
  let prompt = buildMessagesForGemini(tone as any, fetchResult.content, targetLengthDescription);
  
  if (fetchResult.truncated) {
    prompt = `（記事が長いため一部のみ読み込みました）\n\n${prompt}`;
  }

  try {
    const summaryText = await callGeminiAPI(prompt);
    
    return NextResponse.json({ 
      summary: summaryText, // 修正点：ここを 'result' から 'summary' に変更してフロントエンドと合わせる
      truncated: fetchResult.truncated,
      originalLength: fetchResult.originalLength
    });
    
  } catch (err) {
    console.error("Gemini API Handler Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "要約処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * POST リクエストハンドラ
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, mode, tone, toneSample } = body;

    if (!url || !mode) {
      return NextResponse.json({ error: 'URLとモードは必須です' }, { status: 400 });
    }

    const fetchResult = await fetchUrlContent(url);

    if (fetchResult.error || !fetchResult.content) {
      return NextResponse.json({ error: fetchResult.error }, { status: 500 });
    }

    const targetLengthDescription = mode === 'short' ? '200文字程度の短い' : '1000文字程度の詳細な';
    let prompt = buildMessagesForGemini(tone as any, fetchResult.content, targetLengthDescription, toneSample);
    
    if (fetchResult.truncated) {
      prompt = `（記事が長いため一部のみ読み込みました）\n\n${prompt}`;
    }

    const summaryText = await callGeminiAPI(prompt);
    
    return NextResponse.json({ 
      summary: summaryText, // 修正点：ここを 'result' から 'summary' に変更
      truncated: fetchResult.truncated,
      originalLength: fetchResult.originalLength
    });

  } catch (err) {
    console.error("API Route Error:", err);
    return NextResponse.json(
      { error: "システムエラーが発生しました" },
      { status: 500 }
    );
  }
}
