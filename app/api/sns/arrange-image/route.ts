// /app/api/sns/arrange-image/route.ts ver.1
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, prompt, aspectRatio } = body as {
      imageBase64: string;
      prompt: string;
      aspectRatio?: string;
    };

    if (!imageBase64 || !prompt) {
      return NextResponse.json(
        { error: "画像とプロンプトは必須です" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY環境変数が設定されていません");
    }

    // gemini-2.5-flash-image を使用
    const modelName = "gemini-2.5-flash-image";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    // Base64からMIMEタイプを抽出
    let mimeType = "image/jpeg";
    let pureBase64 = imageBase64;
    
    if (imageBase64.startsWith("data:")) {
      const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        pureBase64 = matches[2];
      }
    }

    // リクエストボディを構築
    const requestBody: {
      contents: Array<{
        parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>;
      }>;
      generationConfig: {
        temperature: number;
        maxOutputTokens: number;
        responseModalities?: string[];
      };
    } = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: pureBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseModalities: ["TEXT", "IMAGE"],
      },
    };

    // 最大3回リトライ
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Gemini Image API error:", response.status, errorText);

          // 503エラーの場合リトライ
          if (response.status === 503 && attempt < 2) {
            console.log(`Retrying... attempt ${attempt + 2}`);
            await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
            continue;
          }

          throw new Error(`AI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // レスポンスから画像を抽出
        const candidates = data?.candidates || [];
        if (candidates.length === 0) {
          throw new Error("画像が生成されませんでした");
        }

        const parts = candidates[0]?.content?.parts || [];
        let resultImageBase64 = "";
        let resultText = "";

        for (const part of parts) {
          if (part.inlineData) {
            // 画像データ
            resultImageBase64 = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          } else if (part.text) {
            resultText = part.text;
          }
        }

        if (!resultImageBase64) {
          throw new Error("画像が生成されませんでした。プロンプトを変更してお試しください。");
        }

        return NextResponse.json({
          success: true,
          imageBase64: resultImageBase64,
          text: resultText,
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error("画像生成に失敗しました");
  } catch (error) {
    console.error("Arrange image error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "画像編集中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
