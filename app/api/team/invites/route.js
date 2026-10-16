import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { appUrl } from '@/lib/platforms';
import { limitsOf } from '@/lib/plans';

export async function POST(req) {
  const [ctx, err] = await requireApi('manageTeam');
  if (err) return err;
  const { role, label } = await req.json();
  if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) return NextResponse.json({ error: 'Choose a role.' }, { status: 400 });
  if (role === 'ADMIN' && ctx.role !== 'OWNER') return NextResponse.json({ error: 'Only the owner can invite admins.' }, { status: 403 });
  const members = await prisma.membership.count({ where: { workspaceId: ctx.workspace.id } });
  if (members >= limitsOf(ctx.workspace).members) return NextResponse.json({ error: `Your plan allows ${limitsOf(ctx.workspace).members} team member(s). Upgrade on the Billing page to invite more.` }, { status: 403 });
  const invite = await prisma.invite.create({
    data: {
      workspaceId: ctx.workspace.id, role, label: label?.trim().slice(0, 80) || null, createdById: ctx.user.id,
      token: crypto.randomBytes(24).toString('base64url'), expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  await audit(ctx, 'team.invite_created', `${role.toLowerCase()}${invite.label ? ` for ${invite.label}` : ''}`);
  return NextResponse.json({ url: `${appUrl()}/invite/${invite.token}` });
}
