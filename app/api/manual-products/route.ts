// /app/api/manual-products/route.ts ver.1
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの作成
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const runtime = 'edge';

// データ取得（GET）
export async function GET() {
  try {
    // 表示順（sort_order）で並べて取得
    const { data, error } = await supabase
      .from('manual_products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ products: data });
  } catch (error) {
    console.error('商品データ取得エラー:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

// データ保存（POST）
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { products } = body;

    if (!Array.isArray(products)) {
      return NextResponse.json({ error: 'データ形式が不正です' }, { status: 400 });
    }

    // 4商品分をまとめて更新（Upsert）
    const updates = products.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      url: p.url,
      sort_order: p.sort_order,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('manual_products')
      .upsert(updates);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('商品データ保存エラー:', error);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase.from('manual_products').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('商品データ削除エラー:', error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
