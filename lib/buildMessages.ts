// /lib/buildMessages.ts ver.2

import type { ChatCompletionRequestMessage } from 'openai'

/**
 * 口調サンプルから特徴を抽出
 */
function analyzeWritingStyle(toneSample: string): {
  features: string[]
  examples: string[]
} {
  const features: string[] = []
  const examples: string[] = []
  
  // 文末表現の特徴を抽出
  const sentences = toneSample.match(/[^。！？\n]+[。！？]/g) || []
  const endingPatterns = new Set<string>()
  
  sentences.forEach(sentence => {
    // 文末表現を抽出（最後の5-10文字程度）
    const ending = sentence.slice(-10).trim()
    if (ending) {
      endingPatterns.add(ending)
    }
  })
  
  // よく使う語尾を特定
  const commonEndings = Array.from(endingPatterns).slice(0, 5)
  if (commonEndings.length > 0) {
    examples.push(...commonEndings)
  }
  
  // 特徴的な表現パターンを検出
  const patterns = {
    casual: {
      patterns: [/〜/g, /ね[。！]?$/gm, /よ[。！]?$/gm, /かな[。？]?$/gm, /だよ/g, /だね/g],
      feature: 'カジュアルで親しみやすい'
    },
    formal: {
      patterns: [/です[。]?$/gm, /ます[。]?$/gm, /でしょう/g, /ございます/g],
      feature: '丁寧で礼儀正しい'
    },
    emotional: {
      patterns: [/！/g, /♪/g, /〜/g, /w$/gm, /笑/g, /（笑）/g],
      feature: '感情表現が豊か'
    },
    analytical: {
      patterns: [/つまり/g, /要するに/g, /結論として/g, /第一に/g, /なぜなら/g],
      feature: '論理的で分析的'
    },
    friendly: {
      patterns: [/ね[。！？]?$/gm, /よね/g, /でしょ[。？]?$/gm],
      feature: '親近感のある話しかけ'
    }
  }
  
  // 各パターンの出現頻度をチェック
  Object.entries(patterns).forEach(([key, { patterns: patternList, feature }]) => {
    const count = patternList.reduce((sum, pattern) => {
      const matches = toneSample.match(pattern)
      return sum + (matches ? matches.length : 0)
    }, 0)
    
    if (count > sentences.length * 0.2) { // 20%以上の文で使用
      features.push(feature)
    }
  })
  
  // 一人称の検出
  const firstPersons = ['私', '僕', 'ぼく', '俺', 'おれ', 'あたし', 'わたし', 'わし', '自分']
  const usedFirstPersons = firstPersons.filter(person => toneSample.includes(person))
  if (usedFirstPersons.length > 0) {
    features.push(`一人称は「${usedFirstPersons[0]}」を使用`)
  }
  
  // 特徴的な言い回しを抽出
  const uniquePhrases = [
    /[^。！？\n]*っていうか[^。！？\n]*/g,
    /[^。！？\n]*みたいな[^。！？\n]*/g,
    /[^。！？\n]*的には[^。！？\n]*/g,
    /[^。！？\n]*感じで[^。！？\n]*/g,
    /[^。！？\n]*ってことで[^。！？\n]*/g,
  ]
  
  uniquePhrases.forEach(pattern => {
    const matches = toneSample.match(pattern)
    if (matches && matches.length > 0) {
      examples.push(...matches.slice(0, 2).map(m => m.trim()))
    }
  })
  
  return { features, examples }
}

/**
 * 改善版メッセージ構築関数
 */
export function buildMessages(
  tone: 'custom' | 'formal' | 'casual',
  articleContent: string,
  toneSample?: string
): ChatCompletionRequestMessage[] {
  let messages: ChatCompletionRequestMessage[]

  if (tone === 'custom' && toneSample && toneSample.length > 0) {
    const { features, examples } = analyzeWritingStyle(toneSample)
    
    // より詳細な口調模倣プロンプト
    const systemPrompt = `あなたは優秀な文体模倣AIです。以下の指示に厳密に従って、ユーザーの口調を完璧に再現してください。

【口調サンプル分析結果】
${features.length > 0 ? `特徴: ${features.join('、')}` : ''}

【実際の文例】
以下はユーザーが実際に書いた文章です。この文体を100%真似してください：

--- ユーザーの文章サンプル ---
${toneSample}
--- サンプル終了 ---

【重要な模倣ポイント】
1. 文末表現: サンプルで使われている語尾（です/ます、だ/である、だよ/だね等）を同じ頻度で使用
2. 句読点: 句読点の使い方、「！」「？」「。」の使い分けを完全に真似る
3. 改行: サンプルの改行パターンを維持
4. 語彙選択: サンプルで使われている言葉のレベル（専門用語、カジュアルな表現等）を維持
5. 文の長さ: サンプルの文の長さの傾向を真似る
6. 感情表現: 「！」や「〜」などの感情表現の頻度を同じにする

${examples.length > 0 ? `
【特に使用すべき表現例】
${examples.map(e => `・${e}`).join('\n')}
` : ''}

【タスク】
上記の口調を完全に再現しながら、以下の内容を要約してください。
口調の再現を最優先し、ユーザー本人が書いたかのような自然な文章にしてください。`

    messages = [
      {
        role: 'system',
        content: systemPrompt,
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
        content: `あなたは論理的で客観的な要約を行うAIです。

【文体ルール】
・「です・ます」調を使用
・専門用語は適切に使用し、必要に応じて簡潔な説明を追加
・感情的な表現は避け、事実に基づいた記述
・箇条書きや番号付きリストを効果的に活用
・結論を明確に示す

ビジネス文書や学術的資料に適したフォーマルな文体で要約してください。`,
      },
      {
        role: 'user',
        content: articleContent,
      },
    ]
  } else {
    // casual
    messages = [
      {
        role: 'system',
        content: `あなたは親しみやすくカジュアルな文体で要約するAIです。

【文体ルール】
・「〜だよね」「〜かな」など、親しみやすい語尾を使用
・難しい専門用語は噛み砕いて説明
・「！」や「〜」を適度に使って感情を表現
・読者に話しかけるような口調
・具体例や身近な例えを使用

友人に説明するようなフレンドリーな雰囲気で要約してください。`,
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
 * 口調サンプルの検証関数
 * ユーザーが登録した口調サンプルが十分な特徴を含んでいるか検証
 */
export function validateToneSample(toneSample: string): {
  isValid: boolean
  message: string
  suggestions?: string[]
} {
  if (!toneSample || toneSample.trim().length === 0) {
    return {
      isValid: false,
      message: '口調サンプルを入力してください。'
    }
  }
  
  const trimmed = toneSample.trim()
  const sentences = trimmed.match(/[^。！？\n]+[。！？]/g) || []
  
  if (trimmed.length < 200) {
    return {
      isValid: false,
      message: '口調サンプルは200文字以上入力してください。',
      suggestions: [
        'より多くの文章を追加してください',
        '様々な場面での文章を含めると効果的です'
      ]
    }
  }
  
  if (sentences.length < 5) {
    return {
      isValid: false,
      message: '口調サンプルには最低5文以上含めてください。',
      suggestions: [
        '複数の文章を「。」「！」「？」で区切って入力してください',
        '日常的に使う様々な表現を含めてください'
      ]
    }
  }
  
  // 文末のバリエーションをチェック
  const uniqueEndings = new Set(
    sentences.map(s => s.slice(-5).trim())
  )
  
  if (uniqueEndings.size < 3) {
    return {
      isValid: true, // 警告レベル
      message: '口調サンプルは有効ですが、より多様な文末表現を含めるとさらに効果的です。',
      suggestions: [
        '疑問文、感嘆文、平叙文をバランスよく含める',
        '「です・ます」と「だ・である」など、異なる文体を混ぜてみる'
      ]
    }
  }
  
  return {
    isValid: true,
    message: '口調サンプルは十分な特徴を含んでいます。'
  }
}
