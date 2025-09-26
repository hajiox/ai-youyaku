// /lib/buildMessages.ts ver.3 - Gemini対応版

import type { ChatCompletionRequestMessage } from 'openai'

/**
 * OpenAI用のメッセージ構築（既存）
 */
export function buildMessages(
  tone: 'custom' | 'formal' | 'casual',
  articleContent: string,
  toneSample?: string
): ChatCompletionRequestMessage[] {
  // 既存のコード（変更なし）
  let messages: ChatCompletionRequestMessage[]

  if (tone === 'custom' && toneSample?.length > 0) {
    messages = [
      {
        role: 'system',
        content: `あなたはプロの文体模倣AIです。\n以下はユーザーが実際に書いた投稿文です。この文体・語彙・思考パターンを真似て、次の文章を「同じ口調」で要約してください。\n\n--- サンプル ---\n${toneSample}\n------------------\n\n要約対象は以下です。`,
      },
      {
        role: 'user',
        content: articleContent,
      },
    ]
  } else if (tone === 'formal') {
    messages = [
      {
        role: 'system',
        content: 'あなたは論理的で客観的な要約を行うAIです。ビジネス文書や学術的資料に適したフォーマルな文体で要約してください。',
      },
      {
        role: 'user',
        content: articleContent,
      },
    ]
  } else {
    messages = [
      {
        role: 'system',
        content: 'あなたは親しみやすくカジュアルな文体で要約するAIです。友人に説明するようなノリで要約してください。',
      },
      {
        role: 'user',
        content: articleContent,
      },
    ]
  }

  return messages
}

/**
 * Gemini用のプロンプト構築（新規追加）
 */
export function buildMessagesForGemini(
  tone: 'custom' | 'formal' | 'casual',
  articleContent: string,
  targetLengthDescription: string,
  toneSample?: string
): string {
  let prompt: string

  if (tone === 'custom' && toneSample && toneSample.length > 0) {
    // カスタム口調の場合
    prompt = `あなたは優秀な文体模倣AIです。

【タスク】
以下の記事を要約してください。その際、ユーザーの文体サンプルを完全に模倣してください。

【ユーザーの文体サンプル】
${toneSample}

【重要な模倣ポイント】
- 上記サンプルの語尾（です/ます、だ/である等）を同じ頻度で使用
- 句読点の使い方を完全に真似る
- 感情表現（！、〜等）の頻度を同じにする
- サンプルで使われている言葉のレベルを維持

【要約する記事】
${articleContent}

【要約の条件】
- ${targetLengthDescription}要約を日本語で作成
- ユーザーの口調を完全に再現
- 内容は正確に、でも口調はユーザーそっくりに

要約：`;

  } else if (tone === 'formal') {
    // フォーマルな口調
    prompt = `以下の記事を、ビジネス文書や学術的資料に適したフォーマルな文体で要約してください。

【要約する記事】
${articleContent}

【要約の条件】
- ${targetLengthDescription}要約を日本語で作成
- 「です・ます」調を使用
- 専門用語は適切に使用し、必要に応じて簡潔な説明を追加
- 感情的な表現は避け、事実に基づいた記述
- 論理的で客観的な文体

要約：`;

  } else {
    // カジュアルな口調（デフォルト）
    prompt = `以下の記事を、友達に説明するようなカジュアルで親しみやすい文体で要約してください。

【要約する記事】
${articleContent}

【要約の条件】
- ${targetLengthDescription}要約を日本語で作成
- 「〜だよね」「〜かな」など、親しみやすい語尾を使用
- 難しい専門用語は噛み砕いて説明
- 「！」や「〜」を適度に使って感情を表現
- 読みやすく、フレンドリーな雰囲気

要約：`;
  }

  return prompt
}
