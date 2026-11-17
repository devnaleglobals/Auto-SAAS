import { NextResponse } from 'next/server';
import { clientIp, limitOr429 } from '@/lib/ratelimit';
import { validateTicket, createTicket } from '@/lib/tickets';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Website contact form: creates a ticket the support team answers by email.
export async function POST(req) {
  const limited = await limitOr429([[`contact:ip:${clientIp(req)}`, 5, 3600]]);
  if (limited) return limited;
  const b = await req.json().catch(() => ({}));
  if (b.website) return NextResponse.json({ ok: true }); // hidden field filled = a bot
  const email = String(b.email || '').toLowerCase().trim();
  const name = String(b.name || '').trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: 'Enter your name.' }, { status: 400 });
  if (!EMAIL.test(email)) return NextResponse.json({ error: 'Enter a valid email so we can reply.' }, { status: 400 });
  const [data, msg] = validateTicket(b);
  if (msg) return NextResponse.json({ error: msg }, { status: 400 });
  const limitedEmail = await limitOr429([[`contact:email:${email}`, 3, 3600]]);
  if (limitedEmail) return limitedEmail;
  const t = await createTicket({ email, name, ...data, priority: 'NORMAL', source: 'website' });
  return NextResponse.json({ ok: true, number: t.number });
}
