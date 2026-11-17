import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminApi, adminLog } from '@/lib/admin';
import { PLANS, PLAN_KEYS, currentMonth } from '@/lib/plans';
import { rzp } from '@/lib/razorpay';
import { deleteWorkspace } from '@/lib/account';

const EDIT = ['plan', 'suspend', 'resume', 'resetUsage', 'note', 'details', 'trial'];
const BILLING = ['plan', 'trial', 'cancelSubscription', 'resetUsage'];

// Admin actions on one client workspace.
export async function PATCH(req, { params }) {
  const b = await req.json().catch(() => ({}));
  const perm = BILLING.includes(b.action) ? 'billing' : EDIT.includes(b.action) ? 'clients.edit' : 'clients.edit';
  const [admin, err] = await requireAdminApi(perm);
  if (err) return err;
  const { id } = await params;
  const ws = await prisma.workspace.findUnique({ where: { id } });
  if (!ws) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });

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
    case 'details': {
      const clean = (v, n) => String(v ?? '').trim().slice(0, n) || null;
      const data = {
        name: clean(b.name, 60) || ws.name,
        billingName: clean(b.billingName, 80), billingEmail: clean(b.billingEmail, 120)?.toLowerCase() || null,
        billingPhone: clean(b.billingPhone, 20), billingGstin: clean(b.billingGstin, 15)?.toUpperCase() || null, billingAddress: clean(b.billingAddress, 300),
      };
      if (data.billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.billingEmail)) return NextResponse.json({ error: 'Check the billing email.' }, { status: 400 });
      if (data.billingGstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(data.billingGstin)) return NextResponse.json({ error: 'That GSTIN doesn’t look right.' }, { status: 400 });
      await prisma.workspace.update({ where: { id }, data });
      await adminLog(admin, 'client_details_edited', { workspaceId: id, detail: data.name });
      break;
    }
    case 'trial': {
      if (b.end) {
        await prisma.workspace.update({ where: { id }, data: { trialEndsAt: new Date() } });
        await adminLog(admin, 'trial_ended', { workspaceId: id, detail: ws.name });
        break;
      }
      const until = new Date(b.until);
      if (!PLAN_KEYS.slice(1).includes(b.plan) || isNaN(until) || until <= new Date()) return NextResponse.json({ error: 'Choose the trial plan and a future end date.' }, { status: 400 });
      await prisma.workspace.update({ where: { id }, data: { trialPlan: b.plan, trialEndsAt: until } });
      await adminLog(admin, 'trial_set', { workspaceId: id, detail: `${ws.name}: ${PLANS[b.plan].name} until ${until.toISOString().slice(0, 10)}` });
      break;
    }
    case 'cancelSubscription': {
      if (!ws.razorpaySubId) return NextResponse.json({ error: 'This client has no Razorpay subscription.' }, { status: 400 });
      const now = b.when === 'now';
      try {
        await rzp(`/subscriptions/${ws.razorpaySubId}/cancel`, { method: 'POST', body: { cancel_at_cycle_end: now ? 0 : 1 } });
      } catch (e) {
        return NextResponse.json({ error: `Razorpay: ${e.message}` }, { status: 502 });
      }
      await prisma.workspace.update({ where: { id }, data: now ? { subStatus: 'cancelled', periodEnd: new Date() } : { subStatus: 'cancelled' } });
      await adminLog(admin, 'subscription_cancelled', { workspaceId: id, detail: `${ws.name}: ${now ? 'immediately' : 'at period end'}` });
      break;
    }
    default:
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

// Permanently deletes a client workspace (accounts, automations, leads, logs). Cancels Razorpay first.
export async function DELETE(req, { params }) {
  const [admin, err] = await requireAdminApi('danger');
  if (err) return err;
  const { id } = await params;
  const ws = await prisma.workspace.findUnique({ where: { id } });
  if (!ws) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  const { confirmName } = await req.json().catch(() => ({}));
  if (String(confirmName || '').trim() !== ws.name) return NextResponse.json({ error: 'Type the client name exactly to confirm.' }, { status: 400 });
  await deleteWorkspace(id);
  await adminLog(admin, 'client_deleted', { detail: `${ws.name} (${id})` });
  return NextResponse.json({ ok: true });
}
