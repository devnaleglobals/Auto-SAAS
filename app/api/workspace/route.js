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

// Deletes the workspace and everything in it (accounts, automations, leads, logs). Owner only.
export async function DELETE(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  const { confirmName } = await req.json().catch(() => ({}));
  if (String(confirmName || '').trim() !== ctx.workspace.name) return NextResponse.json({ error: 'Type the workspace name exactly to confirm.' }, { status: 400 });
  if (ctx.workspace.razorpaySubId && ['active', 'authenticated', 'pending'].includes(ctx.workspace.subStatus)) {
    return NextResponse.json({ error: 'Cancel your paid plan on the Billing page first, so you aren’t charged again.' }, { status: 409 });
  }
  await prisma.workspace.delete({ where: { id: ctx.workspace.id } });
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('rr_ws');
  return res;
}
