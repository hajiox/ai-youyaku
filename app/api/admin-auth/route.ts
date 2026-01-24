// /app/api/admin-auth/route.ts ver.1
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthCookieName, getAdminAuthToken } from '@/lib/adminAuth';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      req.ip ||
      `unknown:${req.headers.get('user-agent') || ''}`;
    const limitResult = checkRateLimit(`admin-auth:${ip}`, 10, 60_000);
    if (!limitResult.ok) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(limitResult.retryAfterSec) },
        }
      );
    }

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
      await new Promise((resolve) => setTimeout(resolve, 300));
      return NextResponse.json({ error: '認証失敗' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: '認証エラー' }, { status: 500 });
  }
}
