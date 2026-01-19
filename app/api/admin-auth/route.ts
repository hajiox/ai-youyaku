// /app/api/admin-auth/route.ts ver.1
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthCookieName, getAdminAuthToken } from '@/lib/adminAuth';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword) {
      return NextResponse.json({ error: 'パスワードが設定されていません' }, { status: 500 });
    }

    if (password === correctPassword) {
      const response = NextResponse.json({ success: true });
      const token = getAdminAuthToken();

      response.cookies.set({
        name: getAdminAuthCookieName(),
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 6,
      });

      return response;
    } else {
      return NextResponse.json({ error: '認証失敗' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: '認証エラー' }, { status: 500 });
  }
}
