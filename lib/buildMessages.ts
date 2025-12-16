// /lib/buildMessages.ts ver.5 - 文体模倣強化版

import type { ChatCompletionRequestMessage } from 'openai'

/**
 * OpenAI用のメッセージ構築（互換性のために残存）
 */
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
 * Gemini用のプロンプト構築（文体模倣最優先版）
 */
export function buildMessagesForGemini(
  tone: 'custom' | 'formal' | 'casual',
  articleContent: string,
  toneSample?: string
): string {
  let roleDefinition = "";
  let toneInstruction = "";
  let styleEnforcement = "";

  if (tone === 'custom' && toneSample && toneSample.length > 0) {
    // カスタム口調（最優先）
    roleDefinition = `あなたは以下の「サンプル文章」を書いた本人になりきってください（憑依してください）。AIとしてではなく、この人物として振る舞ってください。`;
    toneInstruction = `
【最重要：文体・人格の模倣】
以下の「サンプル文章」を徹底的に分析し、語尾、口癖、絵文字の使用頻度、テンション、皮肉やユーモアのセンスまで、すべてを完コピしてください。
「〜です・ます」や「〜だ・である」といった語尾の統一だけでなく、"その人らしさ"を再現してください。

[文体サンプル]
${toneSample}
`;
    styleEnforcement = "上記「文体サンプル」の口調で";
  } else if (tone === 'formal') {
    // フォーマル
    roleDefinition = `あなたは優秀なビジネスアナリストです。`;
    toneInstruction = `
【文体指定：フォーマル】
ビジネス文書や日報に適した、論理的で客観的な「です・ます」調で作成してください。
感情的な表現は避け、事実を端的に伝えてください。
`;
    styleEnforcement = "ビジネスライクな「です・ます」調で";
  } else {
    // カジュアル
    roleDefinition = `あなたはSNSで人気のインフルエンサーです。`;
    toneInstruction = `
【文体指定：カジュアル】
友人にLINEやSNSでシェアするような、親しみやすい「ため口（〜だね、〜だよ）」や「柔らかい敬語」を混ぜた文体にしてください。
適度に絵文字を使い、堅苦しくない雰囲気にしてください。
`;
    styleEnforcement = "親しみやすいカジュアルな口調で";
  }

  // プロンプト本文
  return `
${roleDefinition}

以下の記事を読み、**${styleEnforcement}**、3つのプラットフォーム（X, Threads, note）用に要約を作成してください。

${toneInstruction}

【要約対象の記事】
${articleContent}

【出力フォーマット】
以下のキーを持つ **純粋なJSONデータのみ** を出力してください。Markdownのコードブロックは不要です。

{
  "twitter": "${styleEnforcement}書かれたX（旧Twitter）用の要約。130文字以内。ハッシュタグ2つ含む。結論ファースト。",
  "threads": "${styleEnforcement}書かれたThreads用の要約。480文字以内。箇条書きを活用し読みやすく。",
  "note": "${styleEnforcement}書かれたnote用の詳細要約。1500文字以内。見出しや箇条書きを使い、記事の全体像と結論を網羅する。"
}

※注意：JSONの形式は守りつつ、中身の文章は**絶対に指定された文体（口調）を崩さない**でください。
`;
}
