import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { getPlatform, isTokenError } from '@/lib/platforms';
import { alertReconnect } from '@/lib/notify';

// Instagram tokens last 60 days; refresh anything expiring within 15 days.
// Facebook Page tokens don't expire (tokenExpiresAt is null) and are skipped.
export async function GET(req) {
  const key = new URL(req.url).searchParams.get('key');
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}` && key !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  const soon = new Date(Date.now() + 15 * 86400000);
  const channels = await prisma.channel.findMany({ where: { tokenExpiresAt: { not: null, lt: soon } } });
  const results = [];
  for (const c of channels) {
    try {
      const r = await getPlatform(c.platform).refreshToken(decrypt(c.accessTokenEnc));
      if (r) await prisma.channel.update({ where: { id: c.id }, data: { accessTokenEnc: encrypt(r.token), tokenExpiresAt: r.tokenExpiresAt, needsReconnect: false } });
      results.push({ account: c.username, ok: true });
    } catch (e) {
      if (isTokenError(e)) { await prisma.channel.update({ where: { id: c.id }, data: { needsReconnect: true } }); await alertReconnect(c.id).catch(() => {}); }
      results.push({ account: c.username, ok: false, error: e.message });
    }
  }
  return NextResponse.json({ refreshed: results });
}
