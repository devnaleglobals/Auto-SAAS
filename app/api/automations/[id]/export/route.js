import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export async function GET(req, { params }) {
  const ctx = await getContext();
  if (!ctx) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;
  const a = await prisma.automation.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!a) return new Response('Not found', { status: 404 });
  const events = await prisma.event.findMany({ where: { automationId: a.id }, orderBy: { createdAt: 'desc' } });
  const header = ['Time (UTC)', 'User', 'Comment', 'Keyword', 'Message status', 'Message error', 'Reply status', 'Reply text', 'Link clicks', 'First click (UTC)'];
  const rows = events.map((e) => [e.createdAt.toISOString(), e.commenterUsername, e.commentText, e.matchedKeyword, e.dmStatus, e.dmError, e.replyStatus, e.replyText, e.clickCount, e.firstClickedAt?.toISOString()].map(esc).join(','));
  return new Response('\uFEFF' + [header.map(esc).join(','), ...rows].join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${a.name.replace(/[^\w-]+/g, '_')}.csv"` },
  });
}
