import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAutomation } from '@/lib/engine';
import { checkInbox, hasFlow, runFollowUps } from '@/lib/flows';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const BUDGET_MS = 22_000; // stay under cron-job.org's 30-second timeout
const PARALLEL = 5;

// Runs tasks a few at a time and stops starting new ones when the time budget is used up.
async function runPool(tasks, started) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length && Date.now() - started < BUDGET_MS) {
      const t = tasks[i++];
      try { results.push(await t()); } catch (e) { results.push({ error: e.message }); }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return { results, skipped: Math.max(0, tasks.length - i) };
}

// Called every minute by cron-job.org: ?key=CRON_SECRET
// Sends due follow-up reminders, checks comments for every running comment automation (backup to webhooks),
// and reads recent DMs for accounts with flows (backup before message webhooks are approved).
export async function GET(req) {
  const key = new URL(req.url).searchParams.get('key');
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}` && key !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  const started = Date.now();
  const active = await prisma.automation.findMany({
    where: { status: 'ACTIVE', channel: { needsReconnect: false } },
    include: { channel: true },
    orderBy: [{ lastCheckedAt: { sort: 'asc', nulls: 'first' } }], // least recently checked first: every automation gets its turn
  });

  const commentTasks = active.filter((a) => a.type !== 'DM_FLOW').map((a) => async () => ({
    automation: a.name, platform: a.channel.platform, ...(await checkAutomation(a.id)),
  }));
  const inboxChannels = new Map();
  for (const a of active) if (hasFlow(a)) inboxChannels.set(a.channel.id, a.channel);
  const inboxTasks = [...inboxChannels.values()].map((ch) => async () => ({ account: ch.username, ...(await checkInbox(ch)) }));

  const followUps = await runFollowUps().catch((e) => ({ error: e.message }));
  const { results, skipped } = await runPool([...commentTasks, ...inboxTasks], started);
  return NextResponse.json({ ms: Date.now() - started, followUps, checked: results.length, leftForNextRun: skipped, results });
}
