import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/notify';
import { appUrl } from '@/lib/platforms';

// Always answers the same way, so it can't be used to check which emails have accounts.
export async function POST(req) {
  const { email } = await req.json().catch(() => ({}));
  const user = email ? await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } }) : null;
  if (user?.passwordHash) {
    const token = crypto.randomBytes(32).toString('base64url');
    await prisma.passwordReset.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 3600000) } });
    await sendEmail({
      to: [user.email],
      subject: 'Reset your ReplyRelay password',
      text: `Hi ${user.name.split(' ')[0]},\n\nUse this link to set a new password. It works for one hour:\n${appUrl()}/reset-password/${token}\n\nIf you didn’t ask for this, you can ignore this email.`,
    });
  }
  return NextResponse.json({ ok: true });
}
