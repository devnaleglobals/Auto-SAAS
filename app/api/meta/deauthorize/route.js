import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseSignedRequest } from '@/lib/meta';
import { alertReconnect } from '@/lib/notify';

export const dynamic = 'force-dynamic';

// Meta calls this when someone removes ReplyRelay in their Facebook or Instagram settings.
// Set it as the "Deauthorize callback URL" (Facebook Login settings and Instagram business login settings).
export async function POST(req) {
  const sr = await parseSignedRequest(req);
  if (!sr) return NextResponse.json({ error: 'Invalid signed_request' }, { status: 400 });

  let where;
  if (sr.platform === 'FACEBOOK') {
    const user = await prisma.user.findUnique({ where: { facebookId: sr.userId } });
    where = user ? { platform: 'FACEBOOK', connectedById: user.id } : null;
  } else {
    where = { platform: 'INSTAGRAM', externalId: sr.userId };
  }
  const channels = where ? await prisma.channel.findMany({ where }) : [];
  for (const c of channels) {
    // Access is gone: stop the automations and ask the workspace to reconnect (or delete) the account.
    await prisma.channel.update({ where: { id: c.id }, data: { needsReconnect: true } });
    await prisma.auditLog.create({ data: { workspaceId: c.workspaceId, action: 'account.access_removed', detail: `${c.platform === 'FACEBOOK' ? 'Facebook' : 'Instagram'}: ${c.username} (removed in ${c.platform === 'FACEBOOK' ? 'Facebook' : 'Instagram'} settings)` } }).catch(() => {});
    await alertReconnect(c.id).catch(() => {});
  }
  return NextResponse.json({ ok: true, accounts: channels.length });
}
