// Deletes data we no longer need. Runs once a day from /api/cron/cleanup.
// The periods here are the ones stated in the Privacy Policy; change both together.
import { prisma } from './db';

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
  return r;
}
