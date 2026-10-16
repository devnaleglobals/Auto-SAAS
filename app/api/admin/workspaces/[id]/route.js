import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminApi, adminLog } from '@/lib/admin';
import { PLANS, currentMonth } from '@/lib/plans';

// Admin actions on one client workspace.
export async function PATCH(req, { params }) {
  const [admin, err] = await requireAdminApi();
  if (err) return err;
  const { id } = await params;
  const ws = await prisma.workspace.findUnique({ where: { id } });
  if (!ws) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  const b = await req.json();

  switch (b.action) {
    case 'plan': {
      if (!PLANS[b.plan]) return NextResponse.json({ error: 'Choose a plan.' }, { status: 400 });
      const until = b.until ? new Date(b.until) : null;
      if (b.plan !== 'FREE' && (!until || isNaN(until) || until <= new Date())) return NextResponse.json({ error: 'Choose a future end date for the complimentary plan.' }, { status: 400 });
      if (ws.razorpaySubId && ['active', 'authenticated'].includes(ws.subStatus) && b.plan !== ws.plan) {
        return NextResponse.json({ error: 'This client pays through Razorpay. Ask them to change plans on their Billing page, or cancel their subscription in Razorpay first.' }, { status: 409 });
      }
      await prisma.workspace.update({
        where: { id }, data: b.plan === 'FREE'
          ? { plan: 'FREE', subStatus: null, periodEnd: null }
          : { plan: b.plan, subStatus: 'active', periodEnd: until, razorpaySubId: ws.razorpaySubId && ws.subStatus === 'active' ? ws.razorpaySubId : null },
      });
      await adminLog(admin, 'plan_changed', { workspaceId: id, detail: `${ws.name}: ${PLANS[b.plan].name}${until ? ` until ${until.toISOString().slice(0, 10)}` : ''}` });
      break;
    }
    case 'suspend': {
      const reason = String(b.reason || '').trim().slice(0, 300);
      if (!reason) return NextResponse.json({ error: 'Write a reason. The client sees it.' }, { status: 400 });
      await prisma.workspace.update({ where: { id }, data: { suspended: true, suspendReason: reason } });
      await adminLog(admin, 'suspended', { workspaceId: id, detail: `${ws.name}: ${reason}` });
      break;
    }
    case 'resume':
      await prisma.workspace.update({ where: { id }, data: { suspended: false, suspendReason: null } });
      await adminLog(admin, 'resumed', { workspaceId: id, detail: ws.name });
      break;
    case 'resetUsage':
      await prisma.workspace.update({ where: { id }, data: { usageMonth: currentMonth(), usageCount: 0 } });
      await adminLog(admin, 'usage_reset', { workspaceId: id, detail: ws.name });
      break;
    case 'note':
      await prisma.workspace.update({ where: { id }, data: { adminNote: String(b.note || '').slice(0, 2000) || null } });
      await adminLog(admin, 'note_saved', { workspaceId: id, detail: ws.name });
      break;
    default:
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
