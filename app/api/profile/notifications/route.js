import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi } from '@/lib/context';

export async function PATCH(req) {
  const [ctx, err] = await requireApi('view');
  if (err) return err;
  const b = await req.json().catch(() => ({}));
  await prisma.user.update({ where: { id: ctx.user.id }, data: { notifyReconnect: Boolean(b.notifyReconnect), notifyBilling: Boolean(b.notifyBilling) } });
  return NextResponse.json({ ok: true });
}
