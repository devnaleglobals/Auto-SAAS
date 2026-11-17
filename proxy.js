import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Called by Meta, Razorpay and cron services from their own servers: no browser Origin to check.
const SERVER_TO_SERVER = ['/api/webhooks/', '/api/billing/webhook', '/api/cron/', '/api/meta/'];
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ADMIN_PUBLIC = ['/admin/login', '/admin/setup'];

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || '');

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

async function valid(token, audience) {
  if (!token) return false;
  try {
    await jwtVerify(token, secret(), { algorithms: ['HS256'], ...(audience ? { audience } : {}) });
    return true;
  } catch {
    return false;
  }
}

const noStore = (res) => { res.headers.set('Cache-Control', 'private, no-store'); return res; };

export async function proxy(req) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (UNSAFE.has(req.method) && !SERVER_TO_SERVER.some((p) => pathname.startsWith(p)) && crossSite(req)) {
      return NextResponse.json({ error: 'Cross-site request blocked.' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Admin console: its own login and cookie. Pages still check the admin against the database.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    if (ADMIN_PUBLIC.some((p) => pathname.startsWith(p))) return noStore(res);
    if (await valid(req.cookies.get('rr_admin')?.value, 'rr-admin')) return noStore(res);
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  // Client dashboard: quick signature check here; pages still check the session against the database.
  if (await valid(req.cookies.get('rr_session')?.value)) return noStore(NextResponse.next());
  const url = new URL('/login', req.url);
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/dashboard/:path*', '/admin', '/admin/:path*', '/api/:path*'] };
