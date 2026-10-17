import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { appUrl } from '@/lib/platforms';
import { limitsOf } from '@/lib/plans';
import { sendEmail } from '@/lib/notify';

export async function POST(req) {
  const [ctx, err] = await requireApi('manageTeam');
  if (err) return err;
  const { role, label, email } = await req.json();
  const to = String(email || '').trim().toLowerCase();
  if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return NextResponse.json({ error: 'Check the email address.' }, { status: 400 });
  if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) return NextResponse.json({ error: 'Choose a role.' }, { status: 400 });
  if (role === 'ADMIN' && ctx.role !== 'OWNER') return NextResponse.json({ error: 'Only the owner can invite admins.' }, { status: 403 });
  const members = await prisma.membership.count({ where: { workspaceId: ctx.workspace.id } });
  if (members >= limitsOf(ctx.workspace).members) return NextResponse.json({ error: `Your plan allows ${limitsOf(ctx.workspace).members} team member(s). Upgrade on the Billing page to invite more.` }, { status: 403 });
  const invite = await prisma.invite.create({
    data: {
      workspaceId: ctx.workspace.id, role, label: (to || label?.trim() || '').slice(0, 80) || null, createdById: ctx.user.id,
      token: crypto.randomBytes(24).toString('base64url'), expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  await audit(ctx, 'team.invite_created', `${role.toLowerCase()}${invite.label ? ` for ${invite.label}` : ''}`);
  const url = `${appUrl()}/invite/${invite.token}`;
  const emailed = to ? await sendEmail({
    to: [to],
    subject: `${ctx.user.name} invited you to ${ctx.workspace.name} on ReplyRelay`,
    text: `${ctx.user.name} invited you to join the ${ctx.workspace.name} workspace on ReplyRelay as ${role.toLowerCase()}.\n\nAccept the invite (valid for 7 days):\n${url}`,
  }) : false;
  return NextResponse.json({ url, emailed });
}
