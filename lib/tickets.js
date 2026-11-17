// Support tickets: clients raise them in the dashboard (or the website contact form);
// the support team answers in the admin console. Both sides are notified by email.
import { prisma } from './db';
import { appUrl } from './platforms';
import { sendTemplate, getEmailSettings } from './mailer';
import { adminEmails } from './admin';

export const CATEGORIES = { general: 'General question', technical: 'Technical problem', billing: 'Billing and payments', account: 'Account and access', feature: 'Feature request' };
export const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
export const STATUS_LABEL = { OPEN: 'Open', PENDING: 'Waiting for you', RESOLVED: 'Resolved', CLOSED: 'Closed' };
export const ADMIN_STATUS_LABEL = { OPEN: 'Open', PENDING: 'Waiting for client', RESOLVED: 'Resolved', CLOSED: 'Closed' };

const clientUrl = (t) => (t.userId ? `${appUrl()}/dashboard/support/${t.id}` : `${appUrl()}/contact`);
const adminUrl = (t) => `${appUrl()}/admin/tickets/${t.id}`;
const clean = (s, n) => String(s || '').replace(/\r\n/g, '\n').trim().slice(0, n);

async function teamInbox() {
  const cfg = await getEmailSettings();
  if (cfg.supportInbox) return [cfg.supportInbox];
  return adminEmails(['OWNER', 'ADMIN', 'SUPPORT']);
}

export function validateTicket(b) {
  const subject = clean(b.subject, 150);
  const body = clean(b.message ?? b.body, 5000);
  if (subject.length < 4) return [null, 'Write a short subject.'];
  if (body.length < 10) return [null, 'Describe the problem in a few words (at least 10 characters).'];
  return [{ subject, body, category: CATEGORIES[b.category] ? b.category : 'general', priority: PRIORITIES.includes(b.priority) ? b.priority : 'NORMAL' }, null];
}

export async function createTicket({ workspaceId = null, userId = null, email, name, subject, category, priority, body, source = 'app' }) {
  const t = await prisma.ticket.create({
    data: { workspaceId, userId, email: email.toLowerCase(), name: clean(name, 80) || 'Customer', subject, category, priority, source,
      messages: { create: { authorType: 'CLIENT', authorName: clean(name, 80) || email, body } } },
  });
  await sendTemplate('ticket_created_client', t.email, { name: t.name.split(' ')[0], number: t.number, subject: t.subject, url: clientUrl(t) }, { kind: 'support' }).catch(() => {});
  await sendTemplate('ticket_new_admin', await teamInbox(), {
    number: t.number, subject: t.subject, name: t.name, email: t.email, category: CATEGORIES[t.category], priority: t.priority.toLowerCase(), message: body, url: adminUrl(t),
  }, { kind: 'support', replyTo: t.email }).catch(() => {});
  return t;
}

// From the client: reopens the ticket and tells the support team.
export async function clientReply(ticket, { name, body }) {
  await prisma.ticketMessage.create({ data: { ticketId: ticket.id, authorType: 'CLIENT', authorName: clean(name, 80), body } });
  await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'OPEN', lastReplyAt: new Date() } });
  await sendTemplate('ticket_reply_admin', await teamInbox(), { number: ticket.number, subject: ticket.subject, name, message: body, url: adminUrl(ticket) }, { kind: 'support', replyTo: ticket.email }).catch(() => {});
}

// From the support team. Internal notes are never shown or emailed to the client.
export async function adminReply(ticket, admin, { body, internal = false, status }) {
  await prisma.ticketMessage.create({ data: { ticketId: ticket.id, authorType: 'ADMIN', authorName: admin.name, body, internal } });
  const data = { lastReplyAt: new Date() };
  if (!internal) data.status = status || 'PENDING';
  else if (status) data.status = status;
  if (!ticket.assignedToId) data.assignedToId = admin.id;
  await prisma.ticket.update({ where: { id: ticket.id }, data });
  if (!internal) {
    await sendTemplate('ticket_reply_client', ticket.email, { name: ticket.name.split(' ')[0], number: ticket.number, subject: ticket.subject, message: body, url: clientUrl(ticket) }, { kind: 'support' }).catch(() => {});
  }
}
