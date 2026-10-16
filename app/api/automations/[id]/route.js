import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { validateAutomation } from '@/lib/validate';

async function load(params, ctx) {
  const { id } = await params;
  return prisma.automation.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
}

// Body { status } pauses/resumes. Any other body edits the automation (post and account stay the same).
export async function PATCH(req, { params }) {
  const [ctx, err] = await requireApi('editAutomations');
  if (err) return err;
  const a = await load(params, ctx);
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b = await req.json();
  const ch = await prisma.channel.findUnique({ where: { id: a.channelId }, select: { platform: true } });

  if (b.status && Object.keys(b).length === 1) {
    if (!['ACTIVE', 'PAUSED'].includes(b.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    if (b.status === 'ACTIVE' && a.maxReplies && a.replyCount >= a.maxReplies) {
      return NextResponse.json({ error: 'The reply limit is used up. Edit the automation to raise it.' }, { status: 400 });
    }
    await prisma.automation.update({ where: { id: a.id }, data: { status: b.status } });
    await audit(ctx, b.status === 'ACTIVE' ? 'automation.resumed' : 'automation.paused', a.name);
    return NextResponse.json({ ok: true });
  }

  const [data, msg] = validateAutomation({ ...b, type: a.type, scope: a.scope, mediaId: a.mediaId }, { requireTarget: false, platform: ch?.platform });
  if (msg) return NextResponse.json({ error: msg }, { status: 400 });
  const { scope, type, flow, ...editable } = data;
  const reopen = a.status === 'COMPLETED' && (!editable.maxReplies || editable.maxReplies > a.replyCount) && (!editable.endAt || editable.endAt > new Date());
  await prisma.automation.update({
    where: { id: a.id },
    data: { ...editable, flow: flow ?? Prisma.DbNull, name: editable.name || a.name, ...(reopen ? { status: 'ACTIVE' } : {}) },
  });
  await audit(ctx, 'automation.edited', editable.name || a.name);
  return NextResponse.json({ ok: true, id: a.id });
}

export async function DELETE(req, { params }) {
  const [ctx, err] = await requireApi('editAutomations');
  if (err) return err;
  const a = await load(params, ctx);
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.automation.delete({ where: { id: a.id } });
  await audit(ctx, 'automation.deleted', a.name);
  return NextResponse.json({ ok: true });
}
