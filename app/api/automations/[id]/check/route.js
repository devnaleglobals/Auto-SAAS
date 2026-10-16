import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi } from '@/lib/context';
import { checkAutomation } from '@/lib/engine';

export const maxDuration = 60;

export async function POST(req, { params }) {
  const [ctx, err] = await requireApi('editAutomations');
  if (err) return err;
  const { id } = await params;
  const a = await prisma.automation.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (a.status !== 'ACTIVE') return NextResponse.json({ error: 'Resume the automation first.' }, { status: 400 });
  try {
    const r = await checkAutomation(a.id);
    return NextResponse.json(r, { status: r.error ? 502 : 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
