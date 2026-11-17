import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi } from '@/lib/context';
import { PLANS } from '@/lib/plans';
import { describeChange } from '@/lib/planChange';

const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

// What changing to `plan` would mean: charged now, refund of unused days, or a change on the period end date.
export async function GET(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  const plan = new URL(req.url).searchParams.get('plan');
  const ws = await prisma.workspace.findUnique({ where: { id: ctx.workspace.id } });
  const c = await describeChange(ws, plan);
  return NextResponse.json({
    ...c,
    plan: PLANS[plan]?.name, current: PLANS[ws.plan]?.name,
    startsAtLabel: c.startsAt ? day(c.startsAt) : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
