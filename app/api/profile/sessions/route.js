import { NextResponse } from 'next/server';
import { requireApi, audit } from '@/lib/context';
import { revokeSessions } from '@/lib/auth';

// "Log out of all devices": invalidates every session, then signs this browser back in.
export async function POST() {
  const [ctx, err] = await requireApi('view');
  if (err) return err;
  await revokeSessions(ctx.user.id, { keepCurrent: true });
  await audit(ctx, 'profile.sessions_revoked', null);
  return NextResponse.json({ ok: true });
}
