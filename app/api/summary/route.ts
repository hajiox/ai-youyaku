// app/api/summary/route.ts

import { NextResponse } from "next/server"; // NextRequest は使っていないのでこのままでOK

export const runtime = "edge"; // Edgeランタイムで動作

// URLからコンテンツを取得し、簡単なテキスト抽出を行うヘルパー関数
async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        // 一部のウェブサイトは一般的なブラウザのUser-Agentがないと接続をブロックすることがあります
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      // 長すぎるコンテンツの取得を防ぐため、タイムアウトを設定することも検討できます
      // signal: AbortSignal.timeout(10000) // 10秒でタイムアウト (Edge Runtimeでサポートされているか確認が必要)
    });

    if (!response.ok) {
      console.error(`URLの取得に失敗: ${url}, ステータス: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type");

    // HTMLコンテンツの場合 (簡易的なテキスト抽出)
    if (contentType && contentType.includes("text/html")) {
      const html = await response.text();
      // 注意: これは非常に基本的なHTMLタグの除去です。
      // 複雑なウェブサイトやJavaScriptでレンダリングされるページ(SPA)ではうまく機能しません。
      // より高度なHTML解析ライブラリが必要ですが、Edgeランタイムでの利用には制約があります。
      // この部分は、より堅牢なテキスト抽出方法に置き換えることを強く推奨します。
      let plainText = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // styleタグとその中身を削除
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // scriptタグとその中身を削除
        .replace(/<[^>]+>/g, ' ')                         // 残りのHTMLタグをスペースに置換
        .replace(/\s\s+/g, ' ')                           // 連続するスペースを1つに
        .trim();
      
      // 長すぎるテキストをOpenAIに送るのを避けるため、ある程度の文字数でカットすることも検討
      // const MAX_CONTENT_LENGTH = 15000; // 例: 15000文字 (トークン数に注意)
      // if (plainText.length > MAX_CONTENT_LENGTH) {
      //   plainText = plainText.substring(0, MAX_CONTENT_LENGTH) + "... (content truncated)";
      // }
      return plainText;
    }
    // プレーンテキストの場合
    else if (contentType && contentType.includes("text/plain")) {
      return await response.text();
    }
    // その他のコンテンツタイプは非対応
    else {
      console.warn(`未対応のコンテンツタイプ: ${contentType} (URL: ${url})`);
      return null;
    }
  } catch (error) {
    console.error(`URL (${url}) のコンテンツ取得中にエラー:`, error);
    return null;
  }
}

export async function GET(req: Request) { // req の型は Request のまま
  const { searchParams } = new URL(req.url); // searchParams (キャメルケース) を取得
  const urlToSummarize = searchParams.get("url");
  const mode = searchParams.get("mode"); // ★★★★★ここを修正しました！ search_params -> searchParams ★★★★★

  if (!urlToSummarize || !mode || (mode !== "short" && mode !== "long")) {
    return NextResponse.json(
      { error: "リクエストが無効です。url と mode (short または long) を指定してください。" },
      { status: 400 }
    );
  }

  // 1. 指定されたURLからウェブコンテンツを取得
  const webContent = await fetchUrlContent(urlToSummarize);

  if (!webContent) {
    return NextResponse.json(
      { error: `URL (${urlToSummarize}) からコンテンツを取得または処理できませんでした。` },
      { status: 500 } // コンテンツ取得失敗はサーバー側の問題として500を返すか、422 (Unprocessable Entity) なども検討
    );
  }

  // 2. OpenAIに送信するプロンプトを作成
  // 注意: OpenAIは文字数ではなくトークン数でカウントします。これはあくまで目安です。
  const targetLengthDescription = mode === "short" ? "200文字程度の短い" : "1000文字程度の詳細な";
  const prompt = `以下のテキスト内容を日本語で${targetLengthDescription}要約にしてください。\n\nテキスト:\n${webContent}`;

  try {
    // 3. OpenAI APIを呼び出し
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // または "gpt-4o" など、必要に応じて変更
        messages: [{ role: "user", content: prompt }],
        // max_tokens: mode === "short" ? 300 : 1500, // 必要であればトークン数で最大長を制限
      }),
    });

    if (!apiRes.ok) {
      const errorBody = await apiRes.text(); // エラーレスポンスの本文を読み取る
      console.error("OpenAI APIエラー ステータス:", apiRes.status, "本文:", errorBody);
      // OpenAIからのエラー詳細をクライアントに返すように変更
      return NextResponse.json(
        { error: `OpenAI APIリクエストに失敗しました (ステータス: ${apiRes.status})`, details: errorBody },
        { status: apiRes.status } // OpenAIのエラーステータスをそのまま利用
      );
    }

    const data = await apiRes.json();
    // data.choicesが空配列の場合や、messageが存在しない場合も考慮
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
    // エラーオブジェクトの内容をもう少し詳しくログに出力するとデバッグに役立ちます
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
