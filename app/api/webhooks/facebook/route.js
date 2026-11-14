import { NextResponse } from 'next/server';
import { verifyMetaSignature } from '@/lib/crypto';
import { handleWebhookItems, handleMessagingItems } from '@/lib/engine';
import { getPlatform } from '@/lib/platforms';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const PLATFORM = 'FACEBOOK';
const verifyToken = () => process.env.WEBHOOK_VERIFY_TOKEN || process.env.IG_WEBHOOK_VERIFY_TOKEN;

// Meta verification handshake
export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const expected = verifyToken();
  if (expected && p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === expected) {
    return new Response(String(p.get('hub.challenge') || '').replace(/[^\w.-]/g, ''), { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response('Forbidden', { status: 403 });
}

export async function POST(req) {
  const raw = await req.text();
  const platform = getPlatform(PLATFORM);
  if (!verifyMetaSignature(raw, req.headers.get('x-hub-signature-256'), platform.webhookSecret())) {
    return new Response('Invalid signature', { status: 401 });
  }
  let body;
  try { body = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }
  await handleWebhookItems(PLATFORM, platform.parseWebhook(body));
  await handleMessagingItems(PLATFORM, platform.parseMessaging(body));
  return NextResponse.json({ ok: true });
}
