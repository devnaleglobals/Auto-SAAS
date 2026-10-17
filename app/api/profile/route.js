import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi } from '@/lib/context';

export async function PATCH(req) {
  const [ctx, err] = await requireApi('view');
  if (err) return err;
  const { name } = await req.json().catch(() => ({}));
  const clean = String(name || '').trim().slice(0, 60);
  if (clean.length < 2) return NextResponse.json({ error: 'Enter your name.' }, { status: 400 });
  await prisma.user.update({ where: { id: ctx.user.id }, data: { name: clean } });
  return NextResponse.json({ ok: true });
}
