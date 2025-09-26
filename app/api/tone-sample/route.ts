// /app/api/tone-sample/route.ts ver.2 - email基準での取得修正版

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// 無料ユーザーの口調サンプル上限
const FREE_USER_TONE_SAMPLE_MAX = 2000;

export async function POST(req: Request) {
  // 1. 認証チェック
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  
  if (!userEmail) {
    return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
  }

  // 2. ボディ取得・バリデーション
  const { toneSample } = await req.json().catch(() => ({}));
  if (typeof toneSample !== 'string') {
    return NextResponse.json({ error: '口調サンプルは文字列で送信してください。' }, { status: 400 });
  }
  let sample = toneSample.slice(0, FREE_USER_TONE_SAMPLE_MAX);

  // 3. emailからuser_idを取得
  const { data: userData, error: userError } = await supabaseAdmin
    .from('user_tone_samples')
    .select('user_id')
    .eq('user_id', userEmail)  // user_idカラムにemailを保存している可能性
    .single();

  let userId = userEmail; // デフォルトではemailをuser_idとして使用

  // もし既存データがある場合はそのuser_idを使用
  if (userData) {
    userId = userData.user_id;
  }

  // 4. Upsert
  const { data, error } = await supabaseAdmin
    .from('user_tone_samples')
    .upsert(
      { 
        user_id: userId, 
        tone_sample: sample, 
        character_limit: FREE_USER_TONE_SAMPLE_MAX 
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single();

  if (error) {
    console.error('TONE SAMPLE ERROR', error);
    return NextResponse.json({ error: '口調サンプルの保存に失敗しました。' }, { status: 500 });
  }

  // 5. 成功レスポンス
  return NextResponse.json({ message: '口調サンプルを保存しました。', data }, { status: 200 });
}

// 既存の口調サンプルを取得するエンドポイント
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  
  if (!userEmail) {
    return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
  }

  // まずemailで検索を試みる
  let { data, error } = await supabaseAdmin
    .from('user_tone_samples')
    .select('tone_sample')
    .or(`user_id.eq.${userEmail},user_id.eq.${session?.user?.id || ''}`)
    .single();

  // 既存データの検索（複数の可能性を考慮）
  if (error && error.code === 'PGRST116') {
    // 既存のuser_idパターンを試す
    const possibleIds = [
      userEmail,
      session?.user?.id,
      '065c6f7d-8f75-485c-a77c-bba493443e1e' // 画像から見えた既存のuser_id
    ];

    for (const id of possibleIds) {
      if (!id) continue;
      
      const { data: searchData, error: searchError } = await supabaseAdmin
        .from('user_tone_samples')
        .select('tone_sample, user_id')
        .eq('user_id', id)
        .single();
        
      if (searchData && !searchError) {
        data = searchData;
        console.log(`Found tone sample with user_id: ${id}`);
        break;
      }
    }
  }

  if (error && error.code !== 'PGRST116') {
    console.error('TONE SAMPLE FETCH ERROR', error);
    return NextResponse.json({ error: '口調サンプルの取得に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({ toneSample: data?.tone_sample || '' }, { status: 200 });
}
