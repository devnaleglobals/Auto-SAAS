import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi } from '@/lib/context';
import { limitOr429 } from '@/lib/ratelimit';
import { clientReply } from '@/lib/tickets';

export async function POST(req, { params }) {
  const [ctx, err] = await requireApi('view');
  if (err) return err;
  const limited = await limitOr429([[`ticketreply:${ctx.user.id}`, 30, 3600]]);
  if (limited) return limited;
  const { id } = await params;
  const t = await prisma.ticket.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { body } = await req.json().catch(() => ({}));
  const text = String(body || '').trim().slice(0, 5000);
  if (text.length < 2) return NextResponse.json({ error: 'Write a message.' }, { status: 400 });
  await clientReply(t, { name: ctx.user.name, body: text });
  return NextResponse.json({ ok: true });
}
