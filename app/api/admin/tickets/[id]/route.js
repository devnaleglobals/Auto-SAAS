import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminApi, adminLog } from '@/lib/admin';
import { PRIORITIES } from '@/lib/tickets';

const STATUSES = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];

// Change status, priority or who it's assigned to.
export async function PATCH(req, { params }) {
  const [admin, err] = await requireAdminApi('tickets');
  if (err) return err;
  const { id } = await params;
  const t = await prisma.ticket.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const data = {};
  if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 }); data.status = b.status; }
  if (b.priority !== undefined) { if (!PRIORITIES.includes(b.priority)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 }); data.priority = b.priority; }
  if (b.assignedToId !== undefined) {
    if (b.assignedToId && !(await prisma.admin.findUnique({ where: { id: b.assignedToId } }))) return NextResponse.json({ error: 'Unknown admin' }, { status: 400 });
    data.assignedToId = b.assignedToId || null;
  }
  await prisma.ticket.update({ where: { id }, data });
  await adminLog(admin, 'ticket_updated', { workspaceId: t.workspaceId, detail: `#${t.number}: ${Object.entries(b).map(([k, v]) => `${k}=${v}`).join(', ')}` });
  return NextResponse.json({ ok: true });
}
