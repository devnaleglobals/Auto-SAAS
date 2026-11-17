import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminApi, adminLog } from '@/lib/admin';
import { alertSupportAction } from '@/lib/notify';

// { action: 'pauseAll' | 'resumeAll', reason }: emergency switch for all of a client's automations.
// "resumeAll" only resumes the ones that were paused by "pauseAll" (their ids are kept in the Setting table until then).
export async function POST(req, { params }) {
  const [admin, err] = await requireAdminApi('automations');
  if (err) return err;
  const { id } = await params;
  const ws = await prisma.workspace.findUnique({ where: { id }, select: { id: true } });
  if (!ws) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  const { action, reason: r } = await req.json().catch(() => ({}));
  const reason = String(r || '').trim().slice(0, 300);
  if (reason.length < 5) return NextResponse.json({ error: 'Write a short reason. The client will see it.' }, { status: 400 });

  if (action === 'pauseAll') {
    const running = await prisma.automation.findMany({ where: { workspaceId: id, status: 'ACTIVE' }, select: { id: true } });
    if (!running.length) return NextResponse.json({ error: 'No running automations.' }, { status: 400 });
    await prisma.automation.updateMany({ where: { id: { in: running.map((x) => x.id) } }, data: { status: 'PAUSED' } });
    await prisma.auditLog.create({ data: { workspaceId: id, action: 'support.automations_paused_all', detail: `${running.length} automation${running.length > 1 ? 's' : ''} (${reason})` } }).catch(() => {});
    await prisma.setting.upsert({ where: { key: `pausedBySupport:${id}` }, create: { key: `pausedBySupport:${id}`, value: running.map((x) => x.id) }, update: { value: running.map((x) => x.id) } }).catch(() => {});
    await adminLog(admin, 'automation.paused_all', { workspaceId: id, detail: `${running.length}: ${reason}` });
    await alertSupportAction(id, { action: 'paused', automation: `all ${running.length} running automations`, reason }).catch(() => {});
    return NextResponse.json({ ok: true, count: running.length });
  }
  if (action === 'resumeAll') {
    const saved = await prisma.setting.findUnique({ where: { key: `pausedBySupport:${id}` } }).catch(() => null);
    const ids = Array.isArray(saved?.value) ? saved.value : [];
    if (!ids.length) return NextResponse.json({ error: 'Nothing to resume: only automations paused with “Pause all” can be resumed together.' }, { status: 400 });
    const res = await prisma.automation.updateMany({ where: { id: { in: ids }, workspaceId: id, status: 'PAUSED' }, data: { status: 'ACTIVE' } });
    await prisma.setting.delete({ where: { key: `pausedBySupport:${id}` } }).catch(() => {});
    await prisma.auditLog.create({ data: { workspaceId: id, action: 'support.automations_resumed_all', detail: `${res.count} automation${res.count === 1 ? '' : 's'} (${reason})` } }).catch(() => {});
    await adminLog(admin, 'automation.resumed_all', { workspaceId: id, detail: `${res.count}: ${reason}` });
    await alertSupportAction(id, { action: 'resumed', automation: `${res.count} automations`, reason }).catch(() => {});
    return NextResponse.json({ ok: true, count: res.count });
  }
  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
