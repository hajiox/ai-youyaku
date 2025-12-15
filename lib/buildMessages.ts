// /lib/buildMessages.ts ver.4 - 3プラットフォーム対応版

import type { ChatCompletionRequestMessage } from 'openai'

/**
 * OpenAI用のメッセージ構築（使用していない場合は削除しても良いですが互換性のため残します）
 */
export function buildMessages(
  tone: 'custom' | 'formal' | 'casual',
  articleContent: string,
  toneSample?: string
): ChatCompletionRequestMessage[] {
  return [
    {
      role: 'system',
      content: 'あなたはプロの要約AIです。',
    },
    {
      role: 'user',
      content: articleContent,
    },
  ]
}

/**
 * Gemini用のプロンプト構築（JSON出力対応）
 */
export function buildMessagesForGemini(
  tone: 'custom' | 'formal' | 'casual',
  articleContent: string,
  toneSample?: string
): string {
  let toneInstruction = "";

  if (tone === 'custom' && toneSample && toneSample.length > 0) {
    toneInstruction = `
【重要：文体模倣】
以下の「ユーザーの文体サンプル」を分析し、その語彙、リズム、言い回し、絵文字の使い方を**完全に模倣**して要約を作成してください。
内容や事実は記事に基づきますが、"喋り方"はこのユーザーになりきってください。

[ユーザーの文体サンプル]
${toneSample}
`;
  } else if (tone === 'formal') {
    toneInstruction = `
【文体指定：フォーマル】
ビジネス文書や日報に適した、論理的で客観的な「です・ます」調で作成してください。
感情的な表現は避け、事実を端的に伝えてください。
`;
  } else {
    toneInstruction = `
【文体指定：カジュアル】
友人にLINEやSNSでシェアするような、親しみやすい「ため口（〜だね、〜だよ）」や「ですます（柔らかめ）」を混ぜた文体にしてください。
適度に絵文字を使い、堅苦しくない雰囲気にしてください。
`;
  }

  // プロンプト本文
  return `
あなたは優秀なSNS運用アシスタントAIです。
以下の記事を読み、指定された文体で、3つのプラットフォーム（X, Threads, note）に最適な長さの要約を作成してください。

${toneInstruction}

【要約対象の記事】
${articleContent}

【出力フォーマット】
以下のキーを持つ **純粋なJSONデータのみ** を出力してください。Markdownのコードブロック（\`\`\`jsonなど）は不要です。

{
  "twitter": "X（旧Twitter）用の要約。130文字以内。ハッシュタグを2つ程度含む。結論を最初に。",
  "threads": "Threads用の要約。480文字以内。箇条書きを活用し、読みやすく構造化する。",
  "note": "note用の詳細要約。1500文字以内。見出しや箇条書きを使い、記事の全体像、重要なポイント、結論を網羅する。"
}

必ず正しいJSON形式で出力してください。
`;
}
