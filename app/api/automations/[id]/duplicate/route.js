import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';

export async function POST(req, { params }) {
  const [ctx, err] = await requireApi('editAutomations');
  if (err) return err;
  const { id } = await params;
  const a = await prisma.automation.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { id: _i, createdAt, updatedAt, replyCount, lastCheckedAt, lastCheckNote, status, ...rest } = a;
  const copy = await prisma.automation.create({ data: { ...rest, flow: rest.flow ?? undefined, name: `${a.name} (copy)`, createdById: ctx.user.id, status: 'PAUSED' } });
  await audit(ctx, 'automation.duplicated', a.name);
  return NextResponse.json({ id: copy.id });
}
