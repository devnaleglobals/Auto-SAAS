import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi } from '@/lib/context';

// The client closes or reopens their own ticket.
export async function PATCH(req, { params }) {
  const [ctx, err] = await requireApi('view');
  if (err) return err;
  const { id } = await params;
  const t = await prisma.ticket.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { status } = await req.json().catch(() => ({}));
  if (!['CLOSED', 'OPEN'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  await prisma.ticket.update({ where: { id: t.id }, data: { status } });
  await prisma.ticketMessage.create({ data: { ticketId: t.id, authorType: 'SYSTEM', authorName: ctx.user.name, body: status === 'CLOSED' ? `${ctx.user.name} closed the ticket.` : `${ctx.user.name} reopened the ticket.` } });
  return NextResponse.json({ ok: true });
}
