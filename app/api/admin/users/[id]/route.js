import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { limitsOf, loadPlans } from '@/lib/plans';
import { prisma } from '@/lib/db';
import { requireAdminApi, adminLog } from '@/lib/admin';
import { deleteUserAccount } from '@/lib/account';
import { sendTemplate } from '@/lib/mailer';
import { appUrl } from '@/lib/platforms';

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

const ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
const ownerCount = (workspaceId) => prisma.membership.count({ where: { workspaceId, role: 'OWNER' } });

// Admin actions on one client user: edit details, password, sign-in, and their workspace memberships.
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
    case 'setPassword': {
      const pw = String(b.password || '');
      if (pw.length < 8 || pw.length > 72) return NextResponse.json({ error: 'Use 8–72 characters.' }, { status: 400 });
      if (!user.email) return NextResponse.json({ error: 'Add an email for this user first; they sign in with Instagram/Facebook.' }, { status: 400 });
      await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(pw, 12), sessionVersion: { increment: 1 } } });
      await prisma.passwordReset.deleteMany({ where: { userId: id } });
      break;
    }
    case 'role': case 'makeOwner': case 'removeFromWorkspace': case 'addToWorkspace': {
      const ws = await prisma.workspace.findUnique({ where: { id: String(b.workspaceId || '') } });
      if (!ws) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
      const m = await prisma.membership.findUnique({ where: { userId_workspaceId: { userId: id, workspaceId: ws.id } } });
      if (b.action === 'addToWorkspace') {
        if (m) return NextResponse.json({ error: 'Already a member of that client.' }, { status: 409 });
        const role = ['ADMIN', 'MEMBER', 'VIEWER'].includes(b.role) ? b.role : 'MEMBER';
        await loadPlans();
        if ((await prisma.membership.count({ where: { workspaceId: ws.id } })) >= limitsOf(ws).members && !b.force) return NextResponse.json({ error: 'That client’s plan is at its team limit. Raise its limit first, or tick “ignore limit”.' }, { status: 409 });
        await prisma.membership.create({ data: { userId: id, workspaceId: ws.id, role } });
        b.detail = `${ws.name} as ${role.toLowerCase()}`;
        break;
      }
      if (!m) return NextResponse.json({ error: 'Not a member of that client.' }, { status: 404 });
      if (b.action === 'removeFromWorkspace') {
        if (m.role === 'OWNER' && (await ownerCount(ws.id)) <= 1) return NextResponse.json({ error: 'This is the only owner. Make someone else the owner first, or delete the client.' }, { status: 400 });
        await prisma.membership.delete({ where: { id: m.id } });
      } else if (b.action === 'makeOwner') {
        // Transfer ownership: the previous owner(s) become admins.
        await prisma.membership.updateMany({ where: { workspaceId: ws.id, role: 'OWNER' }, data: { role: 'ADMIN' } });
        await prisma.membership.update({ where: { id: m.id }, data: { role: 'OWNER' } });
      } else {
        if (!ROLES.includes(b.role) || b.role === 'OWNER') return NextResponse.json({ error: 'Choose Admin, Member or Viewer (use “Make owner” to transfer ownership).' }, { status: 400 });
        if (m.role === 'OWNER' && (await ownerCount(ws.id)) <= 1) return NextResponse.json({ error: 'This is the only owner. Make someone else the owner first.' }, { status: 400 });
        await prisma.membership.update({ where: { id: m.id }, data: { role: b.role } });
      }
      b.detail = `${ws.name}${b.role ? ` → ${String(b.role).toLowerCase()}` : ''}`;
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
  await adminLog(admin, `user_${b.action}`, { detail: `${user.email || user.name}${b.detail ? `: ${b.detail}` : ''}` });
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
