import { prisma } from './db';
import { PLANS, effectivePlan, currentMonth, usageThisMonth } from './plans';

export async function platformStats() {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const since30 = new Date(Date.now() - 29 * 86400000); since30.setHours(0, 0, 0, 0);
  const [workspaces, users, channels, broken, activeAutomations, paymentsMonth, signups] = await Promise.all([
    prisma.workspace.findMany({ select: { id: true, plan: true, subStatus: true, periodEnd: true, razorpaySubId: true, usageMonth: true, usageCount: true, suspended: true, createdAt: true } }),
    prisma.user.count(),
    prisma.channel.count(),
    prisma.channel.count({ where: { needsReconnect: true } }),
    prisma.automation.count({ where: { status: 'ACTIVE' } }),
    prisma.payment.aggregate({ where: { status: 'captured', createdAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
    prisma.workspace.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } }),
  ]);
  const byPlan = { FREE: 0, STARTER: 0, PRO: 0, AGENCY: 0 };
  let mrr = 0, messages = 0, suspended = 0;
  for (const w of workspaces) {
    const p = effectivePlan(w);
    byPlan[p] = (byPlan[p] || 0) + 1;
    if (p !== 'FREE' && w.razorpaySubId && w.subStatus === 'active') mrr += PLANS[p].price; // comped plans (no Razorpay) aren't revenue
    messages += usageThisMonth(w);
    if (w.suspended) suspended++;
  }
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since30.getTime() + i * 86400000);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: 0 };
  });
  const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
  for (const s of signups) { const i = idx[s.createdAt.toISOString().slice(0, 10)]; if (i !== undefined) days[i].value++; }
  return {
    workspaces: workspaces.length, users, channels, broken, activeAutomations, suspended,
    paying: workspaces.length - byPlan.FREE, byPlan, mrr, messages, month: currentMonth(),
    revenueMonth: Math.round((paymentsMonth._sum.amount || 0) / 100), paymentsMonth: paymentsMonth._count, signupDays: days,
  };
}
