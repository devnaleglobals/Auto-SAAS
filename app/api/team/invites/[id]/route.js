import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';

export async function DELETE(req, { params }) {
  const [ctx, err] = await requireApi('manageTeam');
  if (err) return err;
  const { id } = await params;
  const inv = await prisma.invite.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.invite.delete({ where: { id: inv.id } });
  await audit(ctx, 'team.invite_revoked', inv.label || inv.role.toLowerCase());
  return NextResponse.json({ ok: true });
}
