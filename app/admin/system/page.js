import { prisma } from '@/lib/db';
import { fmtDate, fmtNum } from '@/components/ui';
import AnnouncementForm from '@/components/AnnouncementForm';
import { appUrl } from '@/lib/platforms';

export const dynamic = 'force-dynamic';

const CHECKS = [
  ['Database', 'DATABASE_URL'], ['App URL', 'APP_URL'], ['Session secret', 'AUTH_SECRET'], ['Token encryption key', 'ENCRYPTION_KEY'],
  ['Instagram app', 'IG_APP_ID'], ['Instagram secret', 'IG_APP_SECRET'], ['Facebook app', 'FB_APP_ID'], ['Facebook secret', 'FB_APP_SECRET'],
  ['Webhook verify token', 'WEBHOOK_VERIFY_TOKEN', 'IG_WEBHOOK_VERIFY_TOKEN'], ['Scheduler secret', 'CRON_SECRET'],
  ['Razorpay keys', 'RAZORPAY_KEY_ID'], ['Razorpay webhook secret', 'RAZORPAY_WEBHOOK_SECRET'], ['Razorpay plans', 'RAZORPAY_PLAN_STARTER'],
  ['Email (Resend)', 'RESEND_API_KEY'], ['Platform admins', 'SUPER_ADMIN_EMAILS'],
];

export default async function AdminSystem() {
  const day = new Date(Date.now() - 86400000);
  const announcement = await prisma.setting.findUnique({ where: { key: 'announcement' } }).catch(() => null);
  let db = 'ok';
  try { await prisma.$queryRaw`SELECT 1`; } catch { db = 'down'; }
  const [lastEvent, lastFlow, events24, flows24, failed24, broken, logs] = await Promise.all([
    prisma.event.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    prisma.flowLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    prisma.event.count({ where: { createdAt: { gt: day } } }),
    prisma.flowLog.count({ where: { createdAt: { gt: day } } }),
    prisma.event.count({ where: { createdAt: { gt: day }, OR: [{ dmStatus: 'FAILED' }, { replyStatus: 'FAILED' }] } }),
    prisma.channel.findMany({ where: { needsReconnect: true }, include: { workspace: { select: { name: true } } }, take: 20 }),
    prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);
  const has = (...keys) => keys.some((k) => Boolean(process.env[k]));
  return (
    <>
      <h1 className="font-display text-3xl font-bold">System</h1>
      <p className="mt-1 text-slate">Configuration and recent processing. Secret values are never shown.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold">Configuration</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            <li className="flex justify-between py-2"><span>Database connection</span><span className={db === 'ok' ? 'font-semibold text-ok' : 'font-semibold text-bad'}>{db === 'ok' ? 'Working' : 'Down'}</span></li>
            {CHECKS.map(([label, ...keys]) => (
              <li key={label} className="flex justify-between py-2"><span>{label}</span><span className={has(...keys) ? 'font-semibold text-ok' : 'font-semibold text-bad'}>{has(...keys) ? 'Set' : 'Missing'}</span></li>
            ))}
          </ul>
        </section>
        <section className="space-y-6">
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold">Last 24 hours</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-slate">Comments handled</dt><dd className="font-display text-2xl font-bold">{fmtNum(events24)}</dd></div>
              <div><dt className="text-slate">Conversation steps</dt><dd className="font-display text-2xl font-bold">{fmtNum(flows24)}</dd></div>
              <div><dt className="text-slate">Failed sends</dt><dd className={`font-display text-2xl font-bold ${failed24 ? 'text-bad' : ''}`}>{fmtNum(failed24)}</dd></div>
              <div><dt className="text-slate">Last activity</dt><dd className="font-semibold">{fmtDate([lastEvent?.createdAt, lastFlow?.createdAt].filter(Boolean).sort((a, b) => b - a)[0]) || 'None yet'}</dd></div>
            </dl>
          </div>
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold">Accounts that need reconnecting</h2>
            {broken.length === 0 ? <p className="mt-2 text-sm text-ok">All connections are working.</p> : (
              <ul className="mt-3 divide-y divide-line text-sm">{broken.map((c) => <li key={c.id} className="flex justify-between py-2"><span>{c.username}</span><span className="text-slate">{c.workspace.name}</span></li>)}</ul>
            )}
          </div>
        </section>
      </div>
      <div className="mt-6"><AnnouncementForm initial={announcement?.value || null} /></div>
      <section className="card mt-6 p-6">
        <h2 className="font-display text-lg font-bold">Platform links</h2>
        <p className="mt-1 text-sm text-slate">For the Meta developer app, Razorpay and uptime monitoring.</p>
        <dl className="mt-4 space-y-3 text-sm">
          {[
            ['Instagram redirect URI', '/api/instagram/callback'], ['Facebook redirect URI', '/api/facebook/callback'],
            ['Instagram webhook', '/api/webhooks/instagram'], ['Facebook webhook', '/api/webhooks/facebook'],
            ['Privacy Policy', '/privacy'], ['Terms of Service', '/terms'], ['Data deletion', '/data-deletion'],
            ['Razorpay webhook', '/api/billing/webhook'], ['Health check', '/api/health'],
          ].map(([k, path]) => (
            <div key={k} className="grid gap-1 sm:grid-cols-[200px_1fr]"><dt className="font-semibold">{k}</dt><dd><code className="break-all rounded bg-canvas px-2 py-1">{appUrl()}{path}</code></dd></div>
          ))}
        </dl>
      </section>
      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-bold">Admin log</h2>
        {logs.length === 0 ? <p className="card border-dashed p-5 text-sm text-slate">No admin actions yet.</p> : (
          <ul className="card divide-y divide-line text-sm">{logs.map((l) => <li key={l.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><span><strong>{l.action.replace(/_/g, ' ')}</strong> <span className="text-slate">{l.detail}</span></span><span className="text-xs text-slate">{l.adminEmail}, {fmtDate(l.createdAt)}</span></li>)}</ul>
        )}
      </section>
    </>
  );
}
