import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { WS_COOKIE } from '@/lib/context';

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { workspaceId } = await req.json();
  const m = await prisma.membership.findUnique({ where: { userId_workspaceId: { userId: session.uid, workspaceId } } });
  if (!m) return NextResponse.json({ error: 'Not a member of that workspace.' }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(WS_COOKIE, workspaceId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
  return res;
}
