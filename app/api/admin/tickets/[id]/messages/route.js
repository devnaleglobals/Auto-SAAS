import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminApi } from '@/lib/admin';
import { adminReply } from '@/lib/tickets';

// Reply to the client (emailed) or add an internal note (admins only).
export async function POST(req, { params }) {
  const [admin, err] = await requireAdminApi('tickets');
  if (err) return err;
  const { id } = await params;
  const t = await prisma.ticket.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { body, internal, status } = await req.json().catch(() => ({}));
  const text = String(body || '').trim().slice(0, 10000);
  if (text.length < 2) return NextResponse.json({ error: 'Write a message.' }, { status: 400 });
  if (status && !['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  await adminReply(t, admin, { body: text, internal: Boolean(internal), status });
  return NextResponse.json({ ok: true });
}
