import { prisma } from './db';
import { limitsOf, currentMonth, usageThisMonth, loadPlans } from './plans';
import { getSignupSettings } from './settings';

export const LIMIT_NOTE = 'Monthly message limit reached. Upgrade the plan on the Billing page to keep replying.';

// True if the workspace may send one more message this month.
export async function canSend(workspaceId) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws || ws.suspended) return false;
  if ((await getSignupSettings()).maintenance) return false; // platform maintenance: nothing is sent
  await loadPlans();
  return usageThisMonth(ws) < limitsOf(ws).messages;
}

// Counts sent messages and replies. Resets automatically each month.
export async function recordSend(workspaceId, n = 1) {
  const month = currentMonth();
  const updated = await prisma.workspace.updateMany({ where: { id: workspaceId, usageMonth: month }, data: { usageCount: { increment: n } } });
  if (!updated.count) await prisma.workspace.update({ where: { id: workspaceId }, data: { usageMonth: month, usageCount: n } }).catch(() => {});
}
