// /app/api/registered-links/route.ts ver.1
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const runtime = 'edge';

// 全リンク取得（GET）
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('registered_links')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ links: data || [] });
  } catch (error) {
    console.error('リンク取得エラー:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

// リンク追加（POST）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, title, description, ogp_image_url } = body;

    if (!url || !title) {
      return NextResponse.json({ error: 'URLとタイトルは必須です' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('registered_links')
      .insert([{
        url,
        title,
        description,
        ogp_image_url,
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // UNIQUE制約違反
        return NextResponse.json({ error: 'このURLは既に登録されています' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, link: data });
  } catch (error) {
    console.error('リンク保存エラー:', error);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }
}

// リンク削除（DELETE）
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'IDが必要です' }, { status: 400 });
    }

    const { error } = await supabase
      .from('registered_links')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('リンク削除エラー:', error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
