import { prisma } from '@/lib/db';
import { getContext, audit } from '@/lib/context';

// Quotes a CSV cell. Cells starting with = + - @ (or tab/CR) get a leading ' so Excel and
// Google Sheets don't run them as formulas (commenters control this text).
const esc = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  const ctx = await getContext();
  if (!ctx) return new Response('Unauthorized', { status: 401 });
  const leads = await prisma.lead.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { updatedAt: 'desc' }, include: { channel: { select: { platform: true, username: true } } } });
  const questions = [...new Set(leads.flatMap((l) => Object.keys(l.answers || {})))];
  const header = ['Updated (UTC)', 'Platform', 'Account', 'Username', 'Name', 'Phone', 'Email', ...questions, 'From automation'];
  const rows = leads.map((l) => [
    l.updatedAt.toISOString(), l.channel.platform === 'FACEBOOK' ? 'Facebook' : 'Instagram', l.channel.username, l.username, l.name, l.phone, l.email,
    ...questions.map((q) => l.answers?.[q]), l.source,
  ].map(esc).join(','));
  await audit(ctx, 'leads.exported', `${leads.length} lead${leads.length === 1 ? '' : 's'}`);
  return new Response('\uFEFF' + [header.map(esc).join(','), ...rows].join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="leads.csv"', 'Cache-Control': 'no-store' },
  });
}
