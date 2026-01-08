// /app/api/sns/generate-text/route.ts ver.2
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type Platform = "x" | "instagram" | "story" | "threads";

const PROMPTS: Record<Platform, (text: string, linkUrl?: string) => string> = {
  x: (text, linkUrl) => {
    let prompt = "以下の文章をX（旧Twitter）プレミアム向けに400文字以内で書き換えてください。\n\n";
    prompt += "【厳守ルール】\n";
    prompt += "- 商品名・価格・URL等の主要情報は絶対に変更しない\n";
    prompt += "- 短く端的に、インパクトのある表現\n";
    prompt += "- ハッシュタグは1-2個程度、末尾に配置\n";
    prompt += "- URLがある場合は末尾に配置\n";
    prompt += "- 絵文字は控えめに（0-2個）\n";
    prompt += "- 他のSNS投稿とダブルポストに見えないよう、独自の切り口・文体で書く\n\n";
    prompt += "【元の文章】\n" + text + "\n\n";
    if (linkUrl) {
      prompt += "【挿入するURL】\n" + linkUrl + "\n\n";
    }
    prompt += "【出力形式】\n書き換えた文章のみを出力してください。説明や前置きは不要です。";
    return prompt;
  },
  instagram: (text) => {
    let prompt = "以下の文章をInstagram投稿向けに書き換えてください。\n\n";
    prompt += "【厳守ルール】\n";
    prompt += "- 商品名・価格等の主要情報は絶対に変更しない\n";
    prompt += "- URLは使用不可。代わりに「詳しくはプロフィールのリンクから」等で誘導\n";
    prompt += "- 絵文字を適度に使用（文中に散りばめる）\n";
    prompt += "- ハッシュタグは10-15個程度、本文の後に空行を入れてまとめる\n";
    prompt += "- 語りかけ調、共感を誘う表現\n";
    prompt += "- 改行を適度に入れて読みやすく\n";
    prompt += "- 他のSNS投稿とダブルポストに見えないよう、独自の切り口・文体で書く\n\n";
    prompt += "【元の文章】\n" + text + "\n\n";
    prompt += "【出力形式】\n書き換えた文章のみを出力してください。説明や前置きは不要です。";
    return prompt;
  },
  story: (text) => {
    let prompt = "以下の文章をInstagramストーリー向けの超短文に書き換えてください。\n\n";
    prompt += "【厳守ルール】\n";
    prompt += "- 50文字以内の超短文\n";
    prompt += "- 商品名等の核心情報のみ残す\n";
    prompt += "- アクションを促す表現（「タップしてチェック」「スワイプ」等）\n";
    prompt += "- インパクトのある絵文字を1-3個使用\n";
    prompt += "- 他のSNS投稿とダブルポストに見えないよう、独自の切り口で書く\n\n";
    prompt += "【元の文章】\n" + text + "\n\n";
    prompt += "【出力形式】\n書き換えた文章のみを出力してください。説明や前置きは不要です。";
    return prompt;
  },
  threads: (text, linkUrl) => {
    let prompt = "以下の文章をThreads向けに500文字以内で書き換えてください。\n\n";
    prompt += "【厳守ルール】\n";
    prompt += "- 商品名・価格・URL等の主要情報は絶対に変更しない\n";
    prompt += "- 会話調、フレンドリーな語り口\n";
    prompt += "- ハッシュタグは控えめ（0-3個）、使う場合は末尾に\n";
    prompt += "- URLは自然に本文中に挿入可\n";
    prompt += "- 絵文字は控えめ（0-2個）\n";
    prompt += "- 他のSNS投稿とダブルポストに見えないよう、独自の切り口・文体で書く\n\n";
    prompt += "【元の文章】\n" + text + "\n\n";
    if (linkUrl) {
      prompt += "【挿入するURL】\n" + linkUrl + "\n\n";
    }
    prompt += "【出力形式】\n書き換えた文章のみを出力してください。説明や前置きは不要です。";
    return prompt;
  },
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

    // 最新の安定版モデルを使用
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const results: Record<string, string> = {
      x: "",
      instagram: "",
      story: "",
      threads: "",
    };

    // 順番に生成（レート制限回避）
    for (const platform of platforms) {
      const prompt = PROMPTS[platform](originalText, linkUrl);
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        results[platform] = text.trim();
      } catch (err) {
        console.error("Error generating " + platform + ":", err);
        results[platform] = "【生成エラー】" + platform + "用の文章を生成できませんでした";
      }
      // レート制限回避のため500ms待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Generate text error:", error);
    return NextResponse.json(
      { error: "文章生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
