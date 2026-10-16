import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// For uptime monitors (UptimeRobot, Better Stack): 200 when the app and database respond.
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: 'ok', ms: Date.now() - started });
  } catch (e) {
    return NextResponse.json({ ok: false, db: 'down', error: e.message }, { status: 503 });
  }
}
