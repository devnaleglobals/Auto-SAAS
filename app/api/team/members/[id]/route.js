import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';

async function load(params, ctx) {
  const { id } = await params;
  return prisma.membership.findFirst({ where: { id, workspaceId: ctx.workspace.id }, include: { user: true } });
}

export async function PATCH(req, { params }) {
  const [ctx, err] = await requireApi('manageTeam');
  if (err) return err;
  const m = await load(params, ctx);
  if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { role } = await req.json();
  if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  if (m.role === 'OWNER') return NextResponse.json({ error: "The owner's role can't be changed." }, { status: 400 });
  if ((role === 'ADMIN' || m.role === 'ADMIN') && ctx.role !== 'OWNER') return NextResponse.json({ error: 'Only the owner can change admins.' }, { status: 403 });
  await prisma.membership.update({ where: { id: m.id }, data: { role } });
  await audit(ctx, 'team.role_changed', `${m.user.name} → ${role.toLowerCase()}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const [ctx, err] = await requireApi('manageTeam');
  if (err) return err;
  const m = await load(params, ctx);
  if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (m.role === 'OWNER') return NextResponse.json({ error: "The owner can't be removed." }, { status: 400 });
  if (m.role === 'ADMIN' && ctx.role !== 'OWNER') return NextResponse.json({ error: 'Only the owner can remove admins.' }, { status: 403 });
  await prisma.membership.delete({ where: { id: m.id } });
  await audit(ctx, 'team.member_removed', m.user.name);
  return NextResponse.json({ ok: true });
}
