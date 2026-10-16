import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';

export async function PATCH(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Enter a workspace name.' }, { status: 400 });
  await prisma.workspace.update({ where: { id: ctx.workspace.id }, data: { name: name.trim().slice(0, 60) } });
  await audit(ctx, 'workspace.renamed', name.trim());
  return NextResponse.json({ ok: true });
}
