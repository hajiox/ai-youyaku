import { NextRequest, NextResponse } from 'next/server';

function getAllowedOrigins(req: NextRequest): string[] {
  const env = process.env.APP_ORIGIN;
  const list = env
    ? env.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const host =
    req.headers.get('x-forwarded-host') ??
    req.headers.get('host') ??
    '';

  const proto =
    req.headers.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'development' ? 'http' : 'https');

  const derived = host ? `${proto}://${host}` : '';

  const allowed = [
    ...list,
    ...(derived ? [derived] : []),
  ];

  if (process.env.NODE_ENV === 'development') {
    allowed.push('http://localhost:3000');
    allowed.push('http://127.0.0.1:3000');
  }

  return Array.from(new Set(allowed.map(o => o.replace(/\/+$/, ''))));
}

/**
 * For mutation requests, require Origin header and enforce same-origin/allowlist.
 * Returns NextResponse(403) if blocked, otherwise null.
 */
export function enforceSameOriginForMutation(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (!isMutation) return null;

  const origin = (req.headers.get('origin') || '').replace(/\/+$/, '');
  if (!origin) {
    return NextResponse.json(
      { error: 'Forbidden: missing Origin' },
      { status: 403 }
    );
  }

  const allowed = getAllowedOrigins(req);
  if (!allowed.includes(origin)) {
    return NextResponse.json(
      { error: 'Forbidden: bad Origin', origin, allowed },
      { status: 403 }
    );
  }

  return null;
}
