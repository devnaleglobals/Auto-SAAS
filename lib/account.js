// Deleting connected accounts, workspaces and people, with best-effort clean-up at Meta and Razorpay.
import { prisma } from './db';
import { decrypt } from './crypto';
import { getPlatform } from './platforms';
import { rzp } from './razorpay';

// Stops Meta webhooks for the channel, then deletes it (its automations, logs and leads cascade).
export async function deleteChannel(channel) {
  try {
    await getPlatform(channel.platform).unsubscribe(channel, decrypt(channel.accessTokenEnc));
  } catch (e) {
    console.warn('unsubscribe failed (ignored)', channel.platform, channel.username, e.message);
  }
  await prisma.channel.delete({ where: { id: channel.id } }).catch(() => {});
}

const LIVE_SUB = ['active', 'authenticated', 'pending', 'halted', 'created'];

// Cancels the workspace's Razorpay subscription right away (no further charges).
export async function cancelBillingNow(ws) {
  if (!ws.razorpaySubId || !LIVE_SUB.includes(ws.subStatus || '')) return;
  await rzp(`/subscriptions/${ws.razorpaySubId}/cancel`, { method: 'POST', body: { cancel_at_cycle_end: 0 } })
    .catch((e) => console.warn('Razorpay cancel failed', ws.id, e.message));
}

// Deletes a workspace and everything in it. Payment records go with it; Razorpay keeps its own invoices.
export async function deleteWorkspace(workspaceId) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, include: { channels: true } });
  if (!ws) return;
  await cancelBillingNow(ws);
  for (const c of ws.channels) await deleteChannel(c);
  await prisma.workspace.delete({ where: { id: ws.id } }).catch(() => {});
}

// Deletes a person: every workspace they own, their memberships elsewhere, and their user record.
export async function deleteUserAccount(userId) {
  const owned = await prisma.membership.findMany({ where: { userId, role: 'OWNER' }, select: { workspaceId: true } });
  for (const m of owned) await deleteWorkspace(m.workspaceId);
  await prisma.passwordReset.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  return { workspacesDeleted: owned.length };
}
