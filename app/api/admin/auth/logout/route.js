import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin';

export async function POST(req) {
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303);
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
