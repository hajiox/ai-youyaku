// app/api/summary/route.ts

import { NextResponse } from "next/server";

export const runtime = "edge";

// ★ 入力コンテンツの最大文字数 (日本語文字数)
const MAX_INPUT_CHAR_LENGTH = 5000; // 5000文字で切り捨て

async function fetchUrlContent(url: string): Promise<{ content: string | null, truncated: boolean, originalLength: number, processedLength: number, error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`URLの取得に失敗: ${url}, ステータス: ${response.status}`);
      return { content: null, truncated: false, originalLength: 0, processedLength: 0, error: `URLの取得に失敗 (ステータス: ${response.status})` };
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
      return { content: null, truncated: false, originalLength: 0, processedLength: 0, error: `未対応のコンテンツタイプ: ${contentType}` };
    }

    const originalLength = plainText.length;
    let processedText = plainText;
    let truncated = false;

    if (originalLength === 0) {
        return { content: null, truncated: false, originalLength: 0, processedLength: 0, error: "記事からテキストを抽出できませんでした。" };
    }

    if (originalLength > MAX_INPUT_CHAR_LENGTH) {
      console.log(`記事が長いためトリミング: ${originalLength}文字 -> ${MAX_INPUT_CHAR_LENGTH}文字 (URL: ${url})`);
      processedText = plainText.substring(0, MAX_INPUT_CHAR_LENGTH);
      truncated = true;
    }

    return { content: processedText, truncated, originalLength, processedLength: processedText.length };

  } catch (error) {
    console.error(`URL (${url}) のコンテンツ取得中にエラー:`, error);
    return { content: null, truncated: false, originalLength: 0, processedLength: 0, error: "記事コンテンツの取得中に予期せぬエラーが発生しました。" };
  }
}

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
  if (tone !== 'casual' && tone !== 'formal') {
    return NextResponse.json(
        { error: "無効なトーンが指定されました。casual または formal を指定してください。" },
        { status: 400 }
    );
  }

  const fetchResult = await fetchUrlContent(urlToSummarize);

  if (fetchResult.error || !fetchResult.content) {
    return NextResponse.json(
      { error: fetchResult.error || `URL (${urlToSummarize}) からコンテンツを取得または処理できませんでした。`, truncated: false, originalLength: fetchResult.originalLength, processedLength: fetchResult.processedLength },
      { status: 500 }
    );
  }

  const webContent = fetchResult.content;
  const truncated = fetchResult.truncated;
  const originalLength = fetchResult.originalLength;
  const processedLength = fetchResult.processedLength;


  const targetLengthDescription = mode === "short" ? "200文字以内の" : "1000文字以内の";
  const outputCharLimit = mode === "short" ? 200 : 1000;
  
  let toneInstruction = "";
  if (tone === 'formal') {
    toneInstruction = `この記事の内容を、ビジネスレポートや学術的な文脈に適した、客観的かつフォーマルな文体で`;
  } else {
    toneInstruction = `この記事の内容を、友人に話すようなカジュアルで、親しみやすく分かりやすい口調で`;
  }

  let prompt = `${toneInstruction}、日本語で${targetLengthDescription}要約にしてください。\n\nテキスト:\n${webContent}`;
  if (truncated) {
    // プロンプトにトリミング情報を加えるのは任意ですが、AIの理解を助ける可能性があります。
    prompt = `以下のテキストは、元記事の先頭${MAX_INPUT_CHAR_LENGTH}文字分です（元記事の全長は${originalLength}文字）。\n${prompt}`;
  }


  try {
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      }),
      cache: 'no-store'
    });

    if (!apiRes.ok) {
      const errorBody = await apiRes.text();
      console.error("OpenAI APIエラー ステータス:", apiRes.status, "本文:", errorBody);
      return NextResponse.json(
        { error: `OpenAI APIリクエストに失敗しました (ステータス: ${apiRes.status})`, details: errorBody, truncated, originalLength, processedLength },
        { status: apiRes.status }
      );
    }

    const data = await apiRes.json();
    let text = data.choices?.[0]?.message?.content?.trim() || "";
    if (text.length > outputCharLimit) {
        text = text.slice(0, outputCharLimit);
    }

    if (!text) {
        console.warn("OpenAIからの応答に要約テキストが含まれていませんでした。", data);
        return NextResponse.json(
            { error: "OpenAIからの応答に要約テキストが含まれていませんでした。", truncated, originalLength, processedLength },
            { status: 500 }
        );
    }

    return NextResponse.json({ result: text, truncated, originalLength, processedLength });
  } catch (err) {
    console.error("APIハンドラエラー:", err);
    if (err instanceof Error) {
        console.error("エラーメッセージ:", err.message);
        console.error("スタックトレース:", err.stack);
    }
    return NextResponse.json(
      { error: "サーバー内部エラーが発生しました。", truncated: false, originalLength: 0, processedLength: 0 },
      { status: 500 }
    );
  }
}

// POSTリクエストではカスタム口調を指定できる
export async function POST(req: Request) {
  const { url, mode, tone, toneSample } = await req.json()

  if (!url || !mode || (mode !== 'short' && mode !== 'long')) {
    return NextResponse.json(
      { error: 'リクエストが無効です。url と mode (short または long) を指定してください。' },
      { status: 400 }
    )
  }

  if (tone !== 'casual' && tone !== 'formal' && tone !== 'custom') {
    return NextResponse.json(
      { error: '無効なトーンが指定されました。casual、formal、または custom を指定してください。' },
      { status: 400 }
    )
  }

  if (tone === 'custom' && typeof toneSample !== 'string') {
    return NextResponse.json(
      { error: 'toneSample が必要です。' },
      { status: 400 }
    )
  }

  const fetchResult = await fetchUrlContent(url)

  if (fetchResult.error || !fetchResult.content) {
    return NextResponse.json(
      { error: fetchResult.error || `URL (${url}) からコンテンツを取得または処理できませんでした。`, truncated: false, originalLength: fetchResult.originalLength, processedLength: fetchResult.processedLength },
      { status: 500 }
    )
  }

  const webContent = fetchResult.content
  const truncated = fetchResult.truncated
  const originalLength = fetchResult.originalLength
  const processedLength = fetchResult.processedLength

  const targetLengthDescription = mode === 'short' ? '200文字以内の' : '1000文字以内の'
  const outputCharLimit = mode === 'short' ? 200 : 1000

  let toneInstruction = ''
  if (tone === 'formal') {
    toneInstruction = `この記事の内容を、ビジネスレポートや学術的な文脈に適した、客観的かつフォーマルな文体で`
  } else if (tone === 'custom') {
    toneInstruction = `次の口調サンプルを参考に、同じ文体で` + '\n' + toneSample + '\n'
  } else {
    toneInstruction = `この記事の内容を、友人に話すようなカジュアルで、親しみやすく分かりやすい口調で`
  }

  let prompt = `${toneInstruction}、日本語で${targetLengthDescription}要約にしてください。\n\nテキスト:\n${webContent}`
  if (truncated) {
    prompt = `以下のテキストは、元記事の先頭${MAX_INPUT_CHAR_LENGTH}文字分です（元記事の全長は${originalLength}文字）。\n${prompt}`
  }

  try {
    const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      }),
      cache: 'no-store',
    })

    if (!apiRes.ok) {
      const errorBody = await apiRes.text()
      console.error('OpenAI APIエラー ステータス:', apiRes.status, '本文:', errorBody)
      return NextResponse.json(
        { error: `OpenAI APIリクエストに失敗しました (ステータス: ${apiRes.status})`, details: errorBody, truncated, originalLength, processedLength },
        { status: apiRes.status }
      )
    }

    const data = await apiRes.json()
    let text = data.choices?.[0]?.message?.content?.trim() || ''
    if (text.length > outputCharLimit) {
      text = text.slice(0, outputCharLimit)
    }

    if (!text) {
      console.warn('OpenAIからの応答に要約テキストが含まれていませんでした。', data)
      return NextResponse.json(
        { error: 'OpenAIからの応答に要約テキストが含まれていませんでした。', truncated, originalLength, processedLength },
        { status: 500 }
      )
    }

    return NextResponse.json({ result: text, truncated, originalLength, processedLength })
  } catch (err) {
    console.error('APIハンドラエラー:', err)
    if (err instanceof Error) {
      console.error('エラーメッセージ:', err.message)
      console.error('スタックトレース:', err.stack)
    }
    return NextResponse.json(
      { error: 'サーバー内部エラーが発生しました。', truncated: false, originalLength: 0, processedLength: 0 },
      { status: 500 }
    )
  }
}

