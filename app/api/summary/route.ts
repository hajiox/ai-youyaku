// app/api/summary/route.ts

import { NextResponse } from "next/server";

export const runtime = "edge";

async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`URLの取得に失敗: ${url}, ステータス: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("text/html")) {
      const html = await response.text();
      let plainText = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s\s+/g, ' ')
        .trim();
      return plainText;
    }
    else if (contentType && contentType.includes("text/plain")) {
      return await response.text();
    }
    else {
      console.warn(`未対応のコンテンツタイプ: ${contentType} (URL: ${url})`);
      return null;
    }
  } catch (error) {
    console.error(`URL (${url}) のコンテンツ取得中にエラー:`, error);
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const urlToSummarize = searchParams.get("url");
  const mode = searchParams.get("mode");
  const tone = searchParams.get("tone") || 'casual'; // toneパラメータを取得、デフォルトは'casual'

  if (!urlToSummarize || !mode || (mode !== "short" && mode !== "long")) {
    return NextResponse.json(
      { error: "リクエストが無効です。url と mode (short または long) を指定してください。" },
      { status: 400 }
    );
  }
  // toneパラメータのバリデーション（任意）
  if (tone !== 'casual' && tone !== 'formal') {
    return NextResponse.json(
        { error: "無効なトーンが指定されました。casual または formal を指定してください。" },
        { status: 400 }
    );
  }


  const webContent = await fetchUrlContent(urlToSummarize);

  if (!webContent) {
    return NextResponse.json(
      { error: `URL (${urlToSummarize}) からコンテンツを取得または処理できませんでした。` },
      { status: 500 }
    );
  }

  const targetLengthDescription = mode === "short" ? "200文字程度の短い" : "1000文字程度の詳細な";
  
  // トーンに応じたプロンプトの指示を作成
  let toneInstruction = "";
  if (tone === 'formal') {
    toneInstruction = `この記事の内容を、ビジネスレポートや学術的な文脈に適した、客観的かつフォーマルな文体で`;
  } else { // casual (デフォルト)
    toneInstruction = `この記事の内容を、友人に話すようなカジュアルで、親しみやすく分かりやすい口調で`;
  }

  const prompt = `${toneInstruction}、日本語で${targetLengthDescription}要約にしてください。\n\nテキスト:\n${webContent}`;

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
        { error: `OpenAI APIリクエストに失敗しました (ステータス: ${apiRes.status})`, details: errorBody },
        { status: apiRes.status }
      );
    }

    const data = await apiRes.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";

    if (!text) {
        console.warn("OpenAIからの応答に要約テキストが含まれていませんでした。", data);
        return NextResponse.json(
            { error: "OpenAIからの応答に要約テキストが含まれていませんでした。" },
            { status: 500 }
        );
    }

    return NextResponse.json({ result: text });
  } catch (err) {
    console.error("APIハンドラエラー:", err);
    if (err instanceof Error) {
        console.error("エラーメッセージ:", err.message);
        console.error("スタックトレース:", err.stack);
    }
    return NextResponse.json(
      { error: "サーバー内部エラーが発生しました。" },
      { status: 500 }
    );
  }
}
