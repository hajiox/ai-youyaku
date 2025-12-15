// /app/api/fetch-ogp/route.ts ver.1
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URLが必要です' }, { status: 400 });
    }

    // URLからHTMLを取得
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'URLの取得に失敗しました' }, { status: 400 });
    }

    const html = await response.text();

    // OGP情報を抽出
    const ogpImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1] || '';
    const ogpTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1] || '';
    const ogpDescription = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1] || '';

    // フォールバック: <title>タグから取得
    const pageTitle = ogpTitle || html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';

    // フォールバック: <meta name="description">から取得
    const pageDescription = ogpDescription || html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1] || '';

    return NextResponse.json({
      url,
      title: pageTitle.trim(),
      description: pageDescription.trim(),
      ogp_image_url: ogpImage.trim(),
    });

  } catch (error) {
    console.error('OGP取得エラー:', error);
    return NextResponse.json({ error: 'OGP情報の取得に失敗しました' }, { status: 500 });
  }
}
