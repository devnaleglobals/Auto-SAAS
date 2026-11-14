import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { deleteChannel } from '@/lib/account';

// Disconnects an account: stops Meta webhooks for it, then deletes its token, automations, logs and leads.
export async function DELETE(req, { params }) {
  const [ctx, err] = await requireApi('manageAccounts');
  if (err) return err;
  const { id } = await params;
  const c = await prisma.channel.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await deleteChannel(c);
  await audit(ctx, 'account.disconnected', `${c.platform === 'FACEBOOK' ? 'Facebook' : 'Instagram'}: ${c.username}`);
  return NextResponse.json({ ok: true });
}
