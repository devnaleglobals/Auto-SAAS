import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdminApi, adminLog } from '@/lib/admin';
import { validateAutomation } from '@/lib/validate';
import { hasSupportAccess } from '@/lib/supportAccess';
import { alertSupportAction } from '@/lib/notify';
import { appUrl } from '@/lib/platforms/http';

const load = async (params) => {
  const { id } = await params;
  return prisma.automation.findUnique({ where: { id }, include: { workspace: { select: { id: true, name: true, supportAccessUntil: true } }, channel: { select: { platform: true } } } });
};
const cleanReason = (r) => String(r || '').trim().slice(0, 300);

// Leaves a trace the client can see, and emails the client's owners/admins.
async function record(admin, a, action, verb, reason) {
  await prisma.auditLog.create({ data: { workspaceId: a.workspaceId, userId: null, action: `support.${action}`, detail: `${a.name}${reason ? ` (${reason})` : ''}` } }).catch(() => {});
  await adminLog(admin, `automation.${action.replace('automation_', '')}`, { workspaceId: a.workspaceId, detail: `${a.name}${reason ? `: ${reason}` : ''}` });
  await alertSupportAction(a.workspaceId, { action: verb, automation: a.name, reason, url: `${appUrl()}/dashboard/automations/${a.id}` }).catch(() => {});
}

// { status: 'ACTIVE'|'PAUSED', reason }  pause/resume: allowed for any admin with the "automations" permission.
// Any other body edits the automation: only while the client has given support access.
export async function PATCH(req, { params }) {
  const [admin, err] = await requireAdminApi('automations');
  if (err) return err;
  const a = await load(params);
  if (!a) return NextResponse.json({ error: 'Automation not found.' }, { status: 404 });
  const b = await req.json().catch(() => ({}));

  if (b.status) {
    if (!['ACTIVE', 'PAUSED'].includes(b.status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    const reason = cleanReason(b.reason);
    if (reason.length < 5) return NextResponse.json({ error: 'Write a short reason. The client will see it.' }, { status: 400 });
    if (b.status === a.status) return NextResponse.json({ ok: true });
    if (b.status === 'ACTIVE' && a.maxReplies && a.replyCount >= a.maxReplies) return NextResponse.json({ error: 'Its reply limit is used up. The client (or you, with support access) must raise it first.' }, { status: 400 });
    await prisma.automation.update({ where: { id: a.id }, data: { status: b.status } });
    await record(admin, a, b.status === 'ACTIVE' ? 'automation_resumed' : 'automation_paused', b.status === 'ACTIVE' ? 'resumed' : 'paused', reason);
    return NextResponse.json({ ok: true });
  }

  if (!hasSupportAccess(a.workspace)) return NextResponse.json({ error: 'The client hasn’t given support access. Ask them to turn it on in Settings → Support access.' }, { status: 403 });
  const [data, msg] = validateAutomation({ ...b, type: a.type, scope: a.scope, mediaId: a.mediaId }, { requireTarget: false, platform: a.channel?.platform });
  if (msg) return NextResponse.json({ error: msg }, { status: 400 });
  const { scope, type, flow, ...editable } = data;
  const reopen = a.status === 'COMPLETED' && (!editable.maxReplies || editable.maxReplies > a.replyCount) && (!editable.endAt || editable.endAt > new Date());
  await prisma.automation.update({
    where: { id: a.id },
    data: { ...editable, flow: flow ?? Prisma.DbNull, name: editable.name || a.name, ...(reopen ? { status: 'ACTIVE' } : {}) },
  });
  await record(admin, { ...a, name: editable.name || a.name }, 'automation_edited', 'edited', 'Changed with your support access');
  return NextResponse.json({ ok: true, id: a.id });
}

// Delete: needs the "danger" permission AND the client's support access.
export async function DELETE(req, { params }) {
  const [admin, err] = await requireAdminApi('danger');
  if (err) return err;
  const a = await load(params);
  if (!a) return NextResponse.json({ error: 'Automation not found.' }, { status: 404 });
  if (!hasSupportAccess(a.workspace)) return NextResponse.json({ error: 'The client hasn’t given support access. Pause it instead, or ask them to turn on support access.' }, { status: 403 });
  const reason = cleanReason(new URL(req.url).searchParams.get('reason'));
  if (reason.length < 5) return NextResponse.json({ error: 'Write a short reason. The client will see it.' }, { status: 400 });
  await prisma.automation.delete({ where: { id: a.id } });
  await record(admin, a, 'automation_deleted', 'deleted', reason);
  return NextResponse.json({ ok: true, workspaceId: a.workspaceId });
}
