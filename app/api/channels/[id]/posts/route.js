import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi } from '@/lib/context';
import { decrypt } from '@/lib/crypto';
import { getPlatform, isTokenError } from '@/lib/platforms';

export async function GET(req, { params }) {
  const [ctx, err] = await requireApi('view');
  if (err) return err;
  const { id } = await params;
  const channel = await prisma.channel.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!channel) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  try {
    return NextResponse.json(await getPlatform(channel.platform).listPosts(channel, decrypt(channel.accessTokenEnc), new URL(req.url).searchParams.get('after')));
  } catch (e) {
    if (isTokenError(e)) await prisma.channel.update({ where: { id: channel.id }, data: { needsReconnect: true } });
    return NextResponse.json({ error: isTokenError(e) ? 'This connection has expired. Reconnect it on the Accounts page.' : e.message }, { status: 502 });
  }
}
