import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { WS_COOKIE } from '@/lib/context';
import { limitsOf } from '@/lib/plans';

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { token } = await params;
  const inv = await prisma.invite.findUnique({ where: { token } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) return NextResponse.json({ error: 'This invite link has expired or was already used. Ask for a new one.' }, { status: 410 });
  const existing = await prisma.membership.findUnique({ where: { userId_workspaceId: { userId: session.uid, workspaceId: inv.workspaceId } } });
  if (!existing) {
    const ws = await prisma.workspace.findUnique({ where: { id: inv.workspaceId } });
    const members = await prisma.membership.count({ where: { workspaceId: inv.workspaceId } });
    if (members >= limitsOf(ws).members) return NextResponse.json({ error: 'This workspace has reached its team limit. Ask the owner to upgrade the plan.' }, { status: 403 });
  }
  if (!existing) await prisma.membership.create({ data: { userId: session.uid, workspaceId: inv.workspaceId, role: inv.role } });
  await prisma.invite.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  await prisma.auditLog.create({ data: { workspaceId: inv.workspaceId, userId: session.uid, action: 'team.member_joined', detail: `${user.name} as ${inv.role.toLowerCase()}` } });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(WS_COOKIE, inv.workspaceId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
  return res;
}
