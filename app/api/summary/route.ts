// app/api/summary/route.ts

import { NextResponse } from "next/server";
// ← ここを名前付きインポートに
import { OpenAI } from "openai-edge";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const mode = searchParams.get("mode");

  if (!url || !mode || (mode !== "short" && mode !== "long")) {
    return NextResponse.json(
      { error: "Invalid request. Please provide url and mode (short or long)." },
      { status: 400 }
    );
  }

  try {
    const prompt =
      mode === "short"
        ? `次のWeb記事を200文字以内で簡潔にまとめてください。\n記事URL: ${url}`
        : `次のWeb記事を1000文字以内で詳細にまとめてください。\n記事URL: ${url}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ result: text });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
