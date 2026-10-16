import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

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
  return new Response('\uFEFF' + [header.map(esc).join(','), ...rows].join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="leads.csv"' },
  });
}
