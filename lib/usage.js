import { prisma } from './db';
import { limitsOf, currentMonth, usageThisMonth, loadPlans } from './plans';
import { getSignupSettings } from './settings';
import { getCreditSettings } from './credits';
import { alertLowCredits } from './notify';

export const LIMIT_NOTE = 'Monthly message limit reached and no message credits left. Upgrade the plan or buy credits on the Billing page to keep replying.';

// True if the workspace may send one more message: plan messages left this month, or pay-as-you-go credits.
export async function canSend(workspaceId) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws || ws.suspended) return false;
  if ((await getSignupSettings()).maintenance) return false; // platform maintenance: nothing is sent
  await loadPlans();
  return usageThisMonth(ws) < limitsOf(ws).messages || (ws.credits || 0) > 0;
}

// Counts sent messages. Messages beyond the plan's monthly allowance use credits. Resets each month.
export async function recordSend(workspaceId, n = 1) {
  await loadPlans();
  const month = currentMonth();
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) return;
  const used = usageThisMonth(ws);
  const left = Math.max(0, limitsOf(ws).messages - used);
  const fromCredits = Math.min(Math.max(0, n - left), ws.credits || 0);
  const updated = await prisma.workspace.updateMany({ where: { id: workspaceId, usageMonth: month }, data: { usageCount: { increment: n } } });
  if (!updated.count) await prisma.workspace.update({ where: { id: workspaceId }, data: { usageMonth: month, usageCount: n } }).catch(() => {});
  if (fromCredits > 0) {
    const done = await prisma.workspace.updateMany({ where: { id: workspaceId, credits: { gte: fromCredits } }, data: { credits: { decrement: fromCredits } } });
    // Low-balance email, once each time the balance crosses the threshold.
    if (done.count) {
      const { lowBalance = 100 } = await getCreditSettings();
      const before = ws.credits || 0, after = before - fromCredits;
      if (lowBalance > 0 && before >= lowBalance && after < lowBalance) await alertLowCredits(workspaceId, after).catch(() => {});
    }
  }
}
