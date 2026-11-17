import { NextResponse } from 'next/server';
import { requireApi, audit } from '@/lib/context';
import { limitOr429 } from '@/lib/ratelimit';
import { validateTicket, createTicket } from '@/lib/tickets';

// A client opens a support ticket from the dashboard.
export async function POST(req) {
  const [ctx, err] = await requireApi('view');
  if (err) return err;
  const limited = await limitOr429([[`ticket:user:${ctx.user.id}`, 10, 3600]]);
  if (limited) return limited;
  const [data, msg] = validateTicket(await req.json().catch(() => ({})));
  if (msg) return NextResponse.json({ error: msg }, { status: 400 });
  if (!ctx.user.email) return NextResponse.json({ error: 'Add an email sign-in first, or use the contact form on our website.' }, { status: 400 });
  const t = await createTicket({ workspaceId: ctx.workspace.id, userId: ctx.user.id, email: ctx.user.email, name: ctx.user.name, ...data });
  await audit(ctx, 'support.ticket_opened', `#${t.number} ${t.subject}`);
  return NextResponse.json({ id: t.id, number: t.number });
}
