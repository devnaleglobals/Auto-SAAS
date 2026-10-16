// Sends email through Resend (resend.com). Does nothing if RESEND_API_KEY isn't set.
import { prisma } from './db';
import { appUrl } from './platforms/http';

export async function sendEmail({ to, subject, text }) {
  if (!process.env.RESEND_API_KEY || !to?.length) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || 'ReplyRelay <onboarding@resend.dev>', to, subject, text }),
  }).catch(() => null);
  return Boolean(res?.ok);
}

async function ownerEmails(workspaceId) {
  const ms = await prisma.membership.findMany({ where: { workspaceId, role: { in: ['OWNER', 'ADMIN'] } }, include: { user: { select: { email: true } } } });
  return ms.map((m) => m.user.email).filter(Boolean);
}

// Once a day at most per account.
export async function alertReconnect(channelId) {
  const ch = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!ch || (ch.alertedAt && Date.now() - ch.alertedAt.getTime() < 86400000)) return;
  await prisma.channel.update({ where: { id: ch.id }, data: { alertedAt: new Date() } });
  await sendEmail({
    to: await ownerEmails(ch.workspaceId),
    subject: `Action needed: reconnect ${ch.username}`,
    text: `The ${ch.platform === 'FACEBOOK' ? 'Facebook Page' : 'Instagram account'} ${ch.username} stopped working in ReplyRelay, so its automations are paused.\n\nReconnect it here: ${appUrl()}/dashboard/accounts\n\nThis usually happens when a password changes or access is removed in Instagram/Facebook settings.`,
  });
}

export async function alertPayment(workspaceId, what) {
  await sendEmail({
    to: await ownerEmails(workspaceId),
    subject: what === 'failed' ? 'Payment failed for your ReplyRelay plan' : 'Your ReplyRelay plan was cancelled',
    text: what === 'failed'
      ? `Razorpay couldn't charge your plan renewal. Your plan stays active until the end of the current period. Update your payment method from the link in Razorpay's email, or choose a plan again here: ${appUrl()}/dashboard/billing`
      : `Your paid plan was cancelled. You keep paid features until the end of the period you paid for, then move to Free. Change plans anytime: ${appUrl()}/dashboard/billing`,
  });
}
