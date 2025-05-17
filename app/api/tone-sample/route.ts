// app/api/tone-sample/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next"; // セッション取得用
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Auth.jsの設定をインポート
import { supabase } from '@/lib/supabaseClient'; // Supabaseクライアントをインポート

// 無料ユーザーの口調サンプルの最大文字数
const FREE_USER_TONE_SAMPLE_MAX_LENGTH = 1000;
// (将来的に有料プランを導入する場合)
// const PAID_USER_TONE_SAMPLE_MAX_LENGTH = 3000;

export async function POST(req: Request) {
  // ★★★ デバッグ用ログ追加ここから ★★★
  console.log("API /api/tone-sample called at:", new Date().toISOString());
  console.log("Request Headers:", JSON.stringify(Object.fromEntries(req.headers), null, 2));
  const cookieHeader = req.headers.get('cookie');
  console.log("Cookie Header:", cookieHeader);
  // ★★★ デバッグ用ログ追加ここまで ★★★

  try {
    // 1. セッションからユーザー情報を取得
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      console.log("Session not found or user ID missing. Session:", JSON.stringify(session, null, 2)); // ★セッション詳細ログ
      return NextResponse.json({ error: '認証されていません。ログインしてください。' }, { status: 401 });
    }
    const userId = session.user.id; // Auth.jsが提供するユーザーID
    console.log("User ID from session:", userId); // ★ユーザーID確認ログ

    // 2. リクエストボディから口調サンプルテキストを取得
    const body = await req.json();
    let toneSampleText: string = body.toneSample;

    if (!toneSampleText || typeof toneSampleText !== 'string') {
      return NextResponse.json({ error: '口調サンプルテキストが必要です。' }, { status: 400 });
    }

    // 3. 文字数制限のチェック (ここでは無料ユーザーの制限を適用)
    if (toneSampleText.length > FREE_USER_TONE_SAMPLE_MAX_LENGTH) {
      console.log(`口調サンプルが長いためトリミング: ${toneSampleText.length}文字 -> ${FREE_USER_TONE_SAMPLE_MAX_LENGTH}文字 (User ID: ${userId})`);
      toneSampleText = toneSampleText.substring(0, FREE_USER_TONE_SAMPLE_MAX_LENGTH);
    }

    // 4. Supabaseデータベースに保存 (UPSERT)
    let { data: existingSample, error: selectError } = await supabase
      .from('user_tone_samples')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116は結果0行なので無視
        console.error('Supabase select error:', selectError);
        return NextResponse.json({ error: 'データベースエラーが発生しました (select)。' }, { status: 500 });
    }

    let dbResponse;
    if (existingSample) {
      console.log("Existing sample found, updating for user_id:", userId); // ★更新処理に入るログ
      // 既存データがあれば更新
      const { data, error } = await supabase
        .from('user_tone_samples')
        .update({
          tone_sample: toneSampleText,
          character_limit: FREE_USER_TONE_SAMPLE_MAX_LENGTH,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();
        dbResponse = { data, error };
    } else {
      console.log("No existing sample, inserting new for user_id:", userId); // ★挿入処理に入るログ
      // なければ新規挿入
      const { data, error } = await supabase
        .from('user_tone_samples')
        .insert([
          {
            user_id: userId,
            tone_sample: toneSampleText,
            character_limit: FREE_USER_TONE_SAMPLE_MAX_LENGTH,
          },
        ])
        .select()
        .single();
        dbResponse = { data, error };
    }

    if (dbResponse.error) {
      console.error('Supabase upsert error:', dbResponse.error);
      return NextResponse.json({ error: '口調サンプルの保存に失敗しました。' }, { status: 500 });
    }

    console.log("Tone sample saved successfully for user_id:", userId, "Data:", dbResponse.data); // ★保存成功ログ
    return NextResponse.json({ message: '口調サンプルを保存しました。', savedData: dbResponse.data }, { status: 200 });

  } catch (error) {
    console.error('API /api/tone-sample error:', error);
    if (error instanceof Error && error.message.includes('JSON Parse error')) {
        return NextResponse.json({ error: 'リクエストボディの形式が正しくありません。JSON形式で送信してください。' }, { status: 400 });
    }
    return NextResponse.json({ error: 'サーバー内部エラーが発生しました。' }, { status: 500 });
  }
}
