import { NextResponse } from 'next/server';
import { verifyMetaSignature } from '@/lib/crypto';
import { handleWebhookItems, handleMessagingItems } from '@/lib/engine';
import { getPlatform } from '@/lib/platforms';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const PLATFORM = 'INSTAGRAM';
const verifyToken = () => process.env.WEBHOOK_VERIFY_TOKEN || process.env.IG_WEBHOOK_VERIFY_TOKEN;

// Meta verification handshake
export async function GET(req) {
  const p = new URL(req.url).searchParams;
  if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === verifyToken()) {
    return new Response(p.get('hub.challenge'), { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

export async function POST(req) {
  const raw = await req.text();
  const platform = getPlatform(PLATFORM);
  if (!verifyMetaSignature(raw, req.headers.get('x-hub-signature-256'), platform.webhookSecret())) {
    return new Response('Invalid signature', { status: 401 });
  }
  const body = JSON.parse(raw);
  await handleWebhookItems(PLATFORM, platform.parseWebhook(body));
  await handleMessagingItems(PLATFORM, platform.parseMessaging(body));
  return NextResponse.json({ ok: true });
}
