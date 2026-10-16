import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req) {
  const token = req.cookies.get('rr_session')?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      return NextResponse.next();
    } catch {}
  }
  const url = new URL('/login', req.url);
  url.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/dashboard/:path*'] };
