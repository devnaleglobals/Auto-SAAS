import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { decrypt } from '@/lib/crypto';
import { getPlatform } from '@/lib/platforms';
import { payload } from '@/lib/flows';

// Saves the welcome menu (ice breakers): up to 4 questions, each starting a conversation automation.
export async function PUT(req, { params }) {
  const [ctx, err] = await requireApi('manageAccounts');
  if (err) return err;
  const { id } = await params;
  const channel = await prisma.channel.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!channel) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const { items = [] } = await req.json();
  const clean = [];
  for (const it of items.slice(0, 4)) {
    const question = String(it.question || '').trim();
    if (!question && !it.automationId) continue;
    if (!question) return NextResponse.json({ error: 'Every menu item needs a question.' }, { status: 400 });
    if (question.length > 80) return NextResponse.json({ error: `“${question.slice(0, 30)}…” is longer than 80 characters.` }, { status: 400 });
    const a = await prisma.automation.findFirst({ where: { id: it.automationId, channelId: channel.id } });
    if (!a) return NextResponse.json({ error: `Choose which conversation “${question}” starts.` }, { status: 400 });
    clean.push({ question, automationId: a.id, payload: payload(a.id, 'START') });
  }

  try {
    await getPlatform(channel.platform).setIceBreakers(channel, decrypt(channel.accessTokenEnc), clean);
  } catch (e) {
    return NextResponse.json({ error: `${channel.platform === 'FACEBOOK' ? 'Facebook' : 'Instagram'} rejected the menu: ${e.message}` }, { status: 502 });
  }
  await prisma.channel.update({ where: { id: channel.id }, data: { iceBreakers: clean.map(({ question, automationId }) => ({ question, automationId })) } });
  await audit(ctx, 'account.welcome_menu', `${channel.username}: ${clean.length} question${clean.length === 1 ? '' : 's'}`);
  return NextResponse.json({ ok: true });
}
