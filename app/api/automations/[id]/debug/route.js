import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import { decrypt } from '@/lib/crypto';
import { getPlatform } from '@/lib/platforms';

// Owner-only diagnostics for one automation.
export async function GET(req, { params }) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: 'Log in first' }, { status: 401 });
  const { id } = await params;
  const a = await prisma.automation.findFirst({ where: { id, workspaceId: ctx.workspace.id }, include: { channel: true } });
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const platform = getPlatform(a.channel.platform);
  let comments;
  try {
    const token = decrypt(a.channel.accessTokenEnc);
    const postId = a.mediaId || (await platform.listPosts(a.channel, token)).items[0]?.id;
    const r = await platform.listComments(a.channel, token, postId);
    comments = { method: r.method, reportedCount: r.reportedCount, received: r.comments.length, sample: r.comments.slice(0, 5) };
  } catch (e) {
    comments = { error: e.message, code: e.code };
  }
  return NextResponse.json({
    automation: { scope: a.scope, mediaId: a.mediaId, createdAt: a.createdAt, startAt: a.startAt, status: a.status, lastCheckNote: a.lastCheckNote },
    channel: { platform: a.channel.platform, username: a.channel.username, externalId: a.channel.externalId, needsReconnect: a.channel.needsReconnect, tokenExpiresAt: a.channel.tokenExpiresAt },
    comments,
  });
}
