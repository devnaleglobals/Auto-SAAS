import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { getMedia } from '@/lib/instagram';

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const account = await prisma.igAccount.findFirst({ where: { id: url.searchParams.get('accountId'), userId: session.uid } });
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  try {
    const data = await getMedia(decrypt(account.accessTokenEnc), url.searchParams.get('after'));
    return NextResponse.json({ items: data.data || [], next: data.paging?.next ? data.paging?.cursors?.after : null });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
