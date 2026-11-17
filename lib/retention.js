// Deletes data we no longer need. Runs once a day from /api/cron/cleanup.
// The periods here are the ones stated in the Privacy Policy; change both together.
import { prisma } from './db';
import { sendTemplate } from './mailer';
import { appUrl } from './platforms/http';
import { loadPlans, PLANS } from './plans';

import { RETENTION } from './retentionPolicy';
export { RETENTION };

const ago = (days) => new Date(Date.now() - days * 86400000);

export async function runRetention() {
  const now = new Date();
  const r = {};
  r.inbound = (await prisma.inboundMessage.deleteMany({ where: { createdAt: { lt: ago(RETENTION.dedupeDays) } } })).count;
  r.resets = (await prisma.passwordReset.deleteMany({ where: { expiresAt: { lt: ago(1) } } })).count;
  r.rateLimits = (await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } })).count;
  r.invites = (await prisma.invite.deleteMany({ where: { acceptedAt: null, expiresAt: { lt: ago(30) } } })).count;
  r.flowLogs = (await prisma.flowLog.deleteMany({ where: { createdAt: { lt: ago(RETENTION.activityDays) } } })).count;
  r.conversations = (await prisma.conversation.deleteMany({ where: { updatedAt: { lt: ago(RETENTION.activityDays) } } })).count;
  r.events = (await prisma.event.deleteMany({ where: { createdAt: { lt: ago(RETENTION.activityDays) } } })).count;
  r.leads = (await prisma.lead.deleteMany({ where: { updatedAt: { lt: ago(RETENTION.leadDays) } } })).count;
  r.audit = (await prisma.auditLog.deleteMany({ where: { createdAt: { lt: ago(RETENTION.auditDays) } } })).count;
  r.adminLogs = (await prisma.adminLog.deleteMany({ where: { createdAt: { lt: ago(RETENTION.auditDays) } } })).count;
  r.emailLogs = (await prisma.emailLog.deleteMany({ where: { createdAt: { lt: ago(180) } } })).count;
  r.closedTickets = (await prisma.ticket.deleteMany({ where: { status: 'CLOSED', updatedAt: { lt: ago(RETENTION.auditDays) } } })).count;
  return r;
}

// Emails workspace owners whose free trial ends in about 2 days (the daily job runs once, so once each).
export async function trialReminders() {
  await loadPlans();
  const from = new Date(Date.now() + 2 * 86400000);
  const to = new Date(Date.now() + 3 * 86400000);
  const list = await prisma.workspace.findMany({
    where: { trialEndsAt: { gte: from, lt: to }, OR: [{ razorpaySubId: null }, { subStatus: { notIn: ['active', 'authenticated'] } }] },
    include: { memberships: { where: { role: 'OWNER' }, include: { user: { select: { name: true, email: true, disabled: true } } } } },
  });
  let sent = 0;
  for (const ws of list) {
    const owner = ws.memberships[0]?.user;
    if (!owner?.email || owner.disabled) continue;
    const ok = await sendTemplate('trial_ending', owner.email, {
      name: owner.name.split(' ')[0], workspace: ws.name, plan: PLANS[ws.trialPlan]?.name || ws.trialPlan,
      endDate: ws.trialEndsAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }), url: `${appUrl()}/dashboard/billing`,
    }, { kind: 'alert' });
    if (ok) sent++;
  }
  return { trialReminders: sent };
}
