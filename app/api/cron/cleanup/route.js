import { NextResponse } from 'next/server';
import { cronAuthorized, unauthorized } from '@/lib/cron';
import { runRetention } from '@/lib/retention';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Daily: deletes logs and records older than the retention periods in the Privacy Policy.
export async function GET(req) {
  if (!cronAuthorized(req)) return unauthorized();
  return NextResponse.json({ deleted: await runRetention() });
}
