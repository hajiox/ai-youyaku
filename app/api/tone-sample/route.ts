// /app/api/tone-sample/route.ts ver.5 - 固定UUID使用のシンプル版

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// 無料ユーザーの口調サンプル上限
const FREE_USER_TONE_SAMPLE_MAX = 2000;

// 既存データのUUID（データベースに保存済み）
const EXISTING_USER_ID = '065c6f7d-8f75-485c-a77c-bba493443e1e';

export async function POST(req: Request) {
  // 1. 認証チェック
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
  }

  // 2. ボディ取得・バリデーション
  const { toneSample } = await req.json().catch(() => ({}));
  if (typeof toneSample !== 'string') {
    return NextResponse.json({ error: '口調サンプルは文字列で送信してください。' }, { status: 400 });
  }
  let sample = toneSample.slice(0, FREE_USER_TONE_SAMPLE_MAX);

  // 3. Upsert（既存のUUIDを使用）
  const { data, error } = await supabaseAdmin
    .from('user_tone_samples')
    .upsert(
      { 
        user_id: EXISTING_USER_ID, 
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

  // 4. 成功レスポンス
  return NextResponse.json({ message: '口調サンプルを保存しました。', data }, { status: 200 });
}

// 既存の口調サンプルを取得するエンドポイント
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
  }

  // 既存のUUIDでデータ取得
  const { data, error } = await supabaseAdmin
    .from('user_tone_samples')
    .select('tone_sample')
    .eq('user_id', EXISTING_USER_ID)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('TONE SAMPLE FETCH ERROR', error);
    return NextResponse.json({ error: '口調サンプルの取得に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({ toneSample: data?.tone_sample || '' }, { status: 200 });
}
