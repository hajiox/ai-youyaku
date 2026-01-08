// /app/api/sns/generate-text/route.ts ver.1
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type Platform = "x" | "instagram" | "story" | "threads";

const PROMPTS: Record<Platform, (text: string, linkUrl?: string) => string> = {
  x: (text, linkUrl) => `
以下の文章をX（旧Twitter）プレミアム向けに400文字以内で書き換えてください。

【厳守ルール】
- 商品名・価格・URL等の主要情報は絶対に変更しない
- 短く端的に、インパクトのある表現
- ハッシュタグは1-2個程度、末尾に配置
- URLがある場合は末尾に配置
- 絵文字は控えめに（0-2個）
- 他のSNS投稿とダブルポストに見えないよう、独自の切り口・文体で書く

【元の文章】
${text}

${linkUrl ? `【挿入するURL】\n${linkUrl}` : ""}

【出力形式】
書き換えた文章のみを出力してください。説明や前置きは不要です。
`.trim(),

  instagram: (text) => `
以下の文章をInstagram投稿向けに書き換えてください。

【厳守ルール】
- 商品名・価格等の主要情報は絶対に変更しない
- URLは使用不可。代わりに「詳しくはプロフィールのリンクから✨」等で誘導
- 絵文字を適度に使用（文中に散りばめる）
- ハッシュタグは10-15個程度、本文の後に空行を入れてまとめる
- 語りかけ調、共感を誘う表現（「〜ですよね」「〜しませんか？」等）
- 改行を適度に入れて読みやすく
- 他のSNS投稿とダブルポストに見えないよう、独自の切り口・文体で書く

【元の文章】
${text}

【出力形式】
書き換えた文章のみを出力してください。説明や前置きは不要です。
`.trim(),

  story: (text) => `
以下の文章をInstagramストーリー向けの超短文に書き換えてください。

【厳守ルール】
- 50文字以内の超短文
- 商品名等の核心情報のみ残す
- アクションを促す表現（「タップしてチェック👆」「スワイプ→」等）
- インパクトのある絵文字を1-3個使用
- 他のSNS投稿とダブルポストに見えないよう、独自の切り口で書く

【元の文章】
${text}

【出力形式】
書き換えた文章のみを出力してください。説明や前置きは不要です。
`.trim(),

  threads: (text, linkUrl) => `
以下の文章をThreads向けに500文字以内で書き換えてください。

【厳守ルール】
- 商品名・価格・URL等の主要情報は絶対に変更しない
- 会話調、フレンドリーな語り口（「〜なんだよね」「〜してみて！」等）
- ハッシュタグは控えめ（0-3個）、使う場合は末尾に
- URLは自然に本文中に挿入可
- 絵文字は控えめ（0-2個）
- 他のSNS投稿とダブルポストに見えないよう、独自の切り口・文体で書く

【元の文章】
${text}

${linkUrl ? `【挿入するURL】\n${linkUrl}` : ""}

【出力形式】
書き換えた文章のみを出力してください。説明や前置きは不要です。
`.trim(),
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originalText, platforms, linkUrl } = body as {
      originalText: string;
      platforms: Platform[];
      linkUrl?: string;
    };

    if (!originalText || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: "必須パラメータが不足しています" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // 各プラットフォーム向けに並列生成
    const results: Record<string, string> = {
      x: "",
      instagram: "",
      story: "",
      threads: "",
    };

    const generatePromises = platforms.map(async (platform) => {
      const prompt = PROMPTS[platform](originalText, linkUrl);
      
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        results[platform] = text.trim();
      } catch (err) {
        console.error(`Error generating ${platform}:`, err);
        results[platform] = `【生成エラー】${platform}用の文章を生成できませんでした`;
      }
    });

    await Promise.all(generatePromises);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Generate text error:", error);
    return NextResponse.json(
      { error: "文章生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
