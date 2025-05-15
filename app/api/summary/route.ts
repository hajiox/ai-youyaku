// app/api/summary/route.ts

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const mode = searchParams.get("mode");

  if (!url || !mode || (mode !== "short" && mode !== "long")) {
    return NextResponse.json(
      { error: "Invalid request. Provide url and mode (short or long)." },
      { status: 400 }
    );
  }

  // 要約文字数の目標
  const maxChars = mode === "short" ? 200 : 1000;
  const prompt = `以下の記事URLを約${maxChars}文字で要約してください。\n${url}`;

  try {
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",      // 必要に応じて別モデルに変更
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!apiRes.ok) {
      console.error("OpenAI API error status:", apiRes.status);
      throw new Error("OpenAI API returned " + apiRes.status);
    }

    const data = await apiRes.json();
    const text = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ result: text });
  } catch (err) {
    console.error("API handler error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
