import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/notify';
import { appUrl } from '@/lib/platforms';
import { clientIp, limitOr429 } from '@/lib/ratelimit';

const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

// Always answers the same way, so it can't be used to check which emails have accounts.
// Only a SHA-256 hash of the reset token is stored; the token itself exists only in the email.
export async function POST(req) {
  const { email } = await req.json().catch(() => ({}));
  const e = String(email || '').toLowerCase().trim().slice(0, 200);
  const limited = await limitOr429([[`forgot:ip:${clientIp(req)}`, 10, 3600], [`forgot:email:${e}`, 3, 3600]]);
  if (limited) return limited;
  const user = e ? await prisma.user.findUnique({ where: { email: e } }) : null;
  if (user?.passwordHash) {
    await prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } }); // only the newest link works
    const token = crypto.randomBytes(32).toString('base64url');
    await prisma.passwordReset.create({ data: { token: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 3600000) } });
    await sendEmail({
      to: [user.email],
      subject: 'Reset your ReplyRelay password',
      text: `Hi ${user.name.split(' ')[0]},\n\nUse this link to set a new password. It works for one hour:\n${appUrl()}/reset-password/${token}\n\nIf you didn’t ask for this, you can ignore this email. Your password won’t change.`,
    });
  }
  return NextResponse.json({ ok: true });
}
