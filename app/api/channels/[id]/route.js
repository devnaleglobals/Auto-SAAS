import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';

// Disconnects an account and deletes its automations and logs.
export async function DELETE(req, { params }) {
  const [ctx, err] = await requireApi('manageAccounts');
  if (err) return err;
  const { id } = await params;
  const c = await prisma.channel.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.channel.delete({ where: { id: c.id } });
  await audit(ctx, 'account.disconnected', `${c.platform === 'FACEBOOK' ? 'Facebook' : 'Instagram'}: ${c.username}`);
  return NextResponse.json({ ok: true });
}
