import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Called by Meta, Razorpay and cron services from their own servers: no browser Origin to check.
const SERVER_TO_SERVER = ['/api/webhooks/', '/api/billing/webhook', '/api/cron/', '/api/meta/'];
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Blocks state-changing API calls sent by another website (CSRF), as a second layer on top of SameSite cookies.
function crossSite(req) {
  const origin = req.headers.get('origin');
  if (!origin) return req.headers.get('sec-fetch-site') === 'cross-site';
  try {
    return new URL(origin).host !== req.headers.get('host');
  } catch {
    return true;
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (UNSAFE.has(req.method) && !SERVER_TO_SERVER.some((p) => pathname.startsWith(p)) && crossSite(req)) {
      return NextResponse.json({ error: 'Cross-site request blocked.' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Dashboard pages: quick signature check here; pages still check the session against the database.
  const token = req.cookies.get('rr_session')?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET), { algorithms: ['HS256'] });
      const res = NextResponse.next();
      res.headers.set('Cache-Control', 'private, no-store');
      return res;
    } catch {}
  }
  const url = new URL('/login', req.url);
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/dashboard/:path*', '/api/:path*'] };
