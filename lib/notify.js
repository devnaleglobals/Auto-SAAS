// Alert emails to workspace owners/admins. Sending goes through lib/mailer.js (provider set by the platform admin).
import { prisma } from './db';
import { appUrl } from './platforms/http';
import { sendMail, sendTemplate } from './mailer';

// Kept for older callers: plain text email.
export async function sendEmail({ to, subject, text, kind = 'system' }) {
  return sendMail({ to, subject, text, html: undefined, kind });
}

async function ownerEmails(workspaceId, pref) {
  const ms = await prisma.membership.findMany({ where: { workspaceId, role: { in: ['OWNER', 'ADMIN'] } }, include: { user: { select: { email: true, notifyReconnect: true, notifyBilling: true, disabled: true } } } });
  return ms.filter((m) => !m.user.disabled && (!pref || m.user[pref] !== false)).map((m) => m.user.email).filter(Boolean);
}

// Once a day at most per account.
export async function alertReconnect(channelId) {
  const ch = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!ch || (ch.alertedAt && Date.now() - ch.alertedAt.getTime() < 86400000)) return;
  await prisma.channel.update({ where: { id: ch.id }, data: { alertedAt: new Date() } });
  await sendTemplate('reconnect_alert', await ownerEmails(ch.workspaceId, 'notifyReconnect'), {
    account: ch.username, platform: ch.platform === 'FACEBOOK' ? 'Facebook Page' : 'Instagram account', url: `${appUrl()}/dashboard/accounts`,
  }, { kind: 'alert' });
}

// what: 'failed' | 'cancelled' | 'success' (with { plan, amount })
export async function alertPayment(workspaceId, what, extra = {}) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
  const key = what === 'failed' ? 'payment_failed' : what === 'success' ? 'payment_success' : 'plan_cancelled';
  await sendTemplate(key, await ownerEmails(workspaceId, 'notifyBilling'), { workspace: ws?.name || '', url: `${appUrl()}/dashboard/billing`, ...extra }, { kind: 'alert' });
}
