import { OpenAI } from "@ai-sdk/openai"
import { NextResponse } from "next/server"
import { generateText } from "ai"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get("url")
  const mode = searchParams.get("mode")

  if (!url || !mode || (mode !== "short" && mode !== "long")) {
    return NextResponse.json(
      { error: "Invalid request. Please provide url and mode (short or long)." },
      { status: 400 }
    )
  }

  try {
    const prompt =
      mode === "short"
        ? `次のWeb記事の要点を200文字以内で簡潔にまとめてください。記事URL: ${url}`
        : `次のWeb記事の要点を1000文字以内で詳細にまとめてください。記事URL: ${url}`

    const openai = new OpenAI()
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
    })

    return NextResponse.json({ result: text })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
