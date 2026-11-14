import { prisma } from '@/lib/db';
import { getContext, audit } from '@/lib/context';

// Downloads a copy of the personal data we hold about the signed-in person, plus the
// settings of the workspaces they own (right to access / data portability).
// Access tokens and password hashes are never included.
export async function GET() {
  const ctx = await getContext();
  if (!ctx) return new Response('Sign in first.', { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { id: true, name: true, email: true, facebookId: true, createdAt: true, lastLoginAt: true, termsAcceptedAt: true, notifyReconnect: true, notifyBilling: true },
  });
  const memberships = await prisma.membership.findMany({ where: { userId: user.id }, include: { workspace: { select: { id: true, name: true } } } });
  const ownedIds = memberships.filter((m) => m.role === 'OWNER').map((m) => m.workspaceId);
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: ownedIds } },
    select: {
      id: true, name: true, createdAt: true, plan: true, subStatus: true, periodEnd: true,
      billingName: true, billingEmail: true, billingPhone: true, billingGstin: true, billingAddress: true,
      channels: { select: { platform: true, externalId: true, username: true, name: true, followers: true, connectedAt: true } },
      automations: { select: { name: true, type: true, scope: true, keywords: true, dmMessage: true, commentReplies: true, linkUrl: true, flow: true, status: true, createdAt: true, replyCount: true } },
      payments: { select: { razorpayId: true, invoiceId: true, plan: true, amount: true, currency: true, status: true, createdAt: true } },
      _count: { select: { automations: true } },
    },
  });
  const activity = await prisma.auditLog.findMany({ where: { userId: user.id }, select: { action: true, detail: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1000 });
  const data = {
    exportedAt: new Date().toISOString(),
    note: 'Comment logs and leads are data about other people that your business collected. Download them from the Activity and Leads pages.',
    user,
    memberships: memberships.map((m) => ({ workspace: m.workspace.name, role: m.role, since: m.createdAt })),
    ownedWorkspaces: workspaces,
    yourActivity: activity,
  };
  await audit(ctx, 'profile.data_exported', null);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="replyrelay-my-data.json"', 'Cache-Control': 'no-store' },
  });
}
