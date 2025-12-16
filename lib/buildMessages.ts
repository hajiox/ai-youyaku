// /lib/buildMessages.ts ver.6 - 口調反映・サンドイッチ型プロンプト

import type { ChatCompletionRequestMessage } from 'openai'

export function buildMessages(
  tone: 'custom' | 'formal' | 'casual',
  articleContent: string,
  toneSample?: string
): ChatCompletionRequestMessage[] {
  return [
    { role: 'system', content: 'あなたはプロの要約AIです。' },
    { role: 'user', content: articleContent },
  ]
}

/**
 * Gemini用のプロンプト構築（口調強制力強化版）
 */
export function buildMessagesForGemini(
  tone: 'custom' | 'formal' | 'casual',
  articleContent: string,
  toneSample?: string
): string {
  
  // 1. 基本の役割定義
  let prompt = `
あなたは「要約AI」ではなく、特定の人物の「ゴーストライター」です。
提供される記事の内容を元に、指定されたプラットフォーム（X, Threads, note）向けの投稿文を作成してください。
`;

  // 2. 記事コンテンツの配置
  prompt += `
【対象の記事テキスト】
${articleContent}

--------------------------------------------------
`;

  // 3. 口調指示（記事の直後に配置することで「上書き」を防ぐ）
  if (tone === 'custom' && toneSample && toneSample.length > 0) {
    prompt += `
【⚠️最重要命令：文体コピー】
ここからの指示が最も重要です。
あなたは以下の「文体サンプル」を書いた本人になりきってください。
記事の内容は正確に保ちつつ、**語尾・口癖・リズム・一人称・絵文字の使い方は、すべて以下のサンプルを模倣してください。**

AI特有の「客観的な要約」は禁止です。「この人が記事を読んで感想を呟いている」ように書いてください。

[文体サンプル]
${toneSample}
`;
  } else if (tone === 'formal') {
    prompt += `
【文体指定：フォーマル】
ビジネスパーソン向けに、論理的で簡潔な「です・ます」調で書いてください。
主観や感情は排し、ファクトを重視してください。
`;
  } else {
    prompt += `
【文体指定：カジュアル】
友人に話しかけるような、親しみやすい「カジュアルな口調」で書いてください。
堅苦しい表現は避け、絵文字を適度に使って柔らかい雰囲気にしてください。
`;
  }

  // 4. 出力形式の指定
  prompt += `
--------------------------------------------------
【出力タスク】
上記の「文体」を完全に再現して、以下の3つのJSONデータを作成してください。
（Markdown記法は不要です。純粋なJSONのみ出力してください）

{
  "twitter": "X（旧Twitter）用。130文字以内。文体サンプルの口調で、記事の結論と感想を短く言い切る。ハッシュタグ2個。",
  "threads": "Threads用。480文字以内。文体サンプルの口調で、箇条書きを交えて要点を語る。",
  "note": "note用。1500文字以内。文体サンプルの口調を維持したまま、詳細な解説を行う。"
}
`;

  return prompt;
}
