import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // URLからクエリパラメータを取得
  const searchParams = request.nextUrl.searchParams
  const text = searchParams.get("text")
  const mode = searchParams.get("mode")

  // テキストが無い場合はエラー
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 })
  }

  // モードが不正な場合はエラー
  if (mode !== "short" && mode !== "long") {
    return NextResponse.json({ error: 'Invalid mode. Must be "short" or "long"' }, { status: 400 })
  }

  try {
    // OpenAI APIキーの取得
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OpenAI API key is not configured")
    }

    // プロンプトの設定
    const prompt =
      mode === "short"
        ? `以下の文章を200文字で要約してください\n\n${text}`
        : `以下の文章を1000文字で要約してください\n\n${text}`

    // OpenAI APIへのリクエスト
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "あなたは文章を要約する専門家です。指定された文字数で要約してください。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
    }

    const data = await openaiResponse.json()
    const summary = data.choices[0].message.content.trim()

    return NextResponse.json({ result: summary })
  } catch (error) {
    console.error("Error generating summary:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
