import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { requireAdminApi, adminLog } from '@/lib/admin';
import { deleteUserAccount } from '@/lib/account';
import { sendTemplate } from '@/lib/mailer';
import { appUrl } from '@/lib/platforms';

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

// Admin actions on one client user: disable/enable, sign out everywhere, send a reset link, edit name/email.
export async function PATCH(req, { params }) {
  const [admin, err] = await requireAdminApi('clients.edit');
  if (err) return err;
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  switch (b.action) {
    case 'disable':
      await prisma.user.update({ where: { id }, data: { disabled: true, sessionVersion: { increment: 1 } } });
      break;
    case 'enable':
      await prisma.user.update({ where: { id }, data: { disabled: false } });
      break;
    case 'signout':
      await prisma.user.update({ where: { id }, data: { sessionVersion: { increment: 1 } } });
      break;
    case 'sendReset': {
      if (!user.email) return NextResponse.json({ error: 'This user signs in with Instagram/Facebook and has no email.' }, { status: 400 });
      await prisma.passwordReset.deleteMany({ where: { userId: id, usedAt: null } });
      const token = crypto.randomBytes(32).toString('base64url');
      await prisma.passwordReset.create({ data: { token: hash(token), userId: id, expiresAt: new Date(Date.now() + 3600000) } });
      const sent = await sendTemplate('password_reset', user.email, { name: user.name.split(' ')[0], url: `${appUrl()}/reset-password/${token}` });
      if (!sent) return NextResponse.json({ error: 'The email couldn’t be sent. Check Admin → Emails for the reason.' }, { status: 502 });
      break;
    }
    case 'edit': {
      const name = String(b.name || '').trim().slice(0, 60);
      const email = b.email ? String(b.email).toLowerCase().trim() : null;
      if (name.length < 2) return NextResponse.json({ error: 'Enter a name.' }, { status: 400 });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: 'Check the email.' }, { status: 400 });
      if (email && email !== user.email && (await prisma.user.findUnique({ where: { email } }))) return NextResponse.json({ error: 'Another account already uses that email.' }, { status: 409 });
      await prisma.user.update({ where: { id }, data: { name, ...(email ? { email } : {}) } });
      break;
    }
    default:
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
  await adminLog(admin, `user_${b.action}`, { detail: user.email || user.name });
  return NextResponse.json({ ok: true });
}

// Deletes the user and every workspace they own (cancels those Razorpay subscriptions).
export async function DELETE(req, { params }) {
  const [admin, err] = await requireAdminApi('danger');
  if (err) return err;
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  const { confirm } = await req.json().catch(() => ({}));
  if (String(confirm || '') !== 'DELETE') return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  const r = await deleteUserAccount(id);
  await adminLog(admin, 'user_deleted', { detail: `${user.email || user.name} (+${r.workspacesDeleted} workspace(s))` });
  return NextResponse.json({ ok: true });
}
