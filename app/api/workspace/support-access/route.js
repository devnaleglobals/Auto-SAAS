import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { ACCESS_DAYS } from '@/lib/supportAccess';

// Body { days: 1 | 7 | 30 } grants support edit access; { days: 0 } removes it.
export async function POST(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  const { days } = await req.json().catch(() => ({}));
  const d = Number(days);
  if (d !== 0 && !ACCESS_DAYS.includes(d)) return NextResponse.json({ error: 'Choose 1, 7 or 30 days.' }, { status: 400 });
  const until = d ? new Date(Date.now() + d * 86400000) : null;
  await prisma.workspace.update({ where: { id: ctx.workspace.id }, data: { supportAccessUntil: until } });
  await audit(ctx, d ? 'support.access_granted' : 'support.access_removed', d ? `for ${d} day${d > 1 ? 's' : ''}` : null);
  return NextResponse.json({ ok: true, until });
}
