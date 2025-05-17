// app/api/tone-sample/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Auth.jsの設定をインポート
import { supabase } from '@/lib/supabaseClient'; // Supabaseクライアントをインポート

// 無料ユーザーの口調サンプルの最大文字数
const FREE_USER_TONE_SAMPLE_MAX_LENGTH = 1000;
// (将来的に有料プランを導入する場合)
// const PAID_USER_TONE_SAMPLE_MAX_LENGTH = 3000;

export async function POST(req: Request) {
  // ★★★ AUTH_SECRET 確認ログここから ★★★
  console.log("AUTH_SECRET in API route:", process.env.AUTH_SECRET ? "Exists" : "MISSING or undefined");
  if (process.env.AUTH_SECRET) {
    console.log("AUTH_SECRET length:", process.env.AUTH_SECRET.length);
    // セキュリティのため、実際の値の出力はコメントアウトしておきます。
    // 必要であれば、ローカル開発環境でのみ最初の数文字を出力するなどしてください。
    // console.log("AUTH_SECRET value (first 5 chars):", process.env.AUTH_SECRET.substring(0, 5));
  }
  // ★★★ AUTH_SECRET 確認ログここまで ★★★

  // ★★★ リクエストヘッダー確認ログここから ★★★
  console.log("API /api/tone-sample called at:", new Date().toISOString());
  // Headersオブジェクトをプレーンなオブジェクトに変換してJSON文字列化
  const headersObject: { [key: string]: string } = {};
  req.headers.forEach((value, key) => {
    headersObject[key] = value;
  });
  console.log("Request Headers:", JSON.stringify(headersObject, null, 2));
  const cookieHeader = req.headers.get('cookie');
  console.log("Cookie Header:", cookieHeader);
  // ★★★ リクエストヘッダー確認ログここまで ★★★

  try {
    // 1. セッションからユーザー情報を取得
    console.log("Attempting to get session...");
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      console.log("Session not found or user ID missing. Session object:", JSON.stringify(session, null, 2));
      return NextResponse.json({ error: '認証されていません。ログインしてください。' }, { status: 401 });
    }
    const userId = session.user.id;
    console.log("User ID from session:", userId);

    // 2. リクエストボディから口調サンプルテキストを取得
    console.log("Attempting to parse request body...");
    const body = await req.json();
    let toneSampleText: string = body.toneSample;
    console.log("Received toneSampleText length:", toneSampleText?.length);

    if (!toneSampleText || typeof toneSampleText !== 'string') {
      console.log("toneSampleText is missing or not a string.");
      return NextResponse.json({ error: '口調サンプルテキストが必要です。' }, { status: 400 });
    }

    // 3. 文字数制限のチェック
    if (toneSampleText.length > FREE_USER_TONE_SAMPLE_MAX_LENGTH) {
      console.log(`口調サンプルが長いためトリミング: ${toneSampleText.length}文字 -> ${FREE_USER_TONE_SAMPLE_MAX_LENGTH}文字 (User ID: ${userId})`);
      toneSampleText = toneSampleText.substring(0, FREE_USER_TONE_SAMPLE_MAX_LENGTH);
    }

    // 4. Supabaseデータベースに保存 (UPSERT)
    console.log("Checking for existing sample for user_id:", userId);
    let { data: existingSample, error: selectError } = await supabase
      .from('user_tone_samples')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116は「結果が0行」のエラーなので正常ケースとして扱う
        console.error('Supabase select error:', JSON.stringify(selectError, null, 2));
        return NextResponse.json({ error: 'データベースエラーが発生しました (select)。' }, { status: 500 });
    }

    let dbResponse;
    if (existingSample) {
      console.log("Existing sample found (id:", existingSample.id,"), updating for user_id:", userId);
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
      console.log("No existing sample, inserting new for user_id:", userId);
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
      console.error('Supabase upsert error:', JSON.stringify(dbResponse.error, null, 2));
      return NextResponse.json({ error: '口調サンプルの保存に失敗しました。' }, { status: 500 });
    }

    console.log("Tone sample saved successfully for user_id:", userId, "Saved Data:", JSON.stringify(dbResponse.data, null, 2));
    return NextResponse.json({ message: '口調サンプルを保存しました。', savedData: dbResponse.data }, { status: 200 });

  } catch (error) {
    console.error('API /api/tone-sample caught an error:', error);
    if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        if (error.message.includes('JSON Parse error') || error.name === 'SyntaxError') { // より広範なJSONエラーチェック
            return NextResponse.json({ error: 'リクエストボディの形式が正しくありません。JSON形式で送信してください。' }, { status: 400 });
        }
    }
    return NextResponse.json({ error: 'サーバー内部エラーが発生しました。' }, { status: 500 });
  }
}
