import type { ChatCompletionRequestMessage } from 'openai'

export function buildMessages(
  tone: 'custom' | 'formal' | 'casual',
  articleContent: string,
  toneSample?: string
): ChatCompletionRequestMessage[] {
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
