import { prisma } from '@/lib/db';
import { stepsOf } from '@/lib/flows';

// Tracked links. Two kinds:
//  - <code>                    : the link in a comment->DM message (one per comment)
//  - <trackCode>.<stepId>.<i>  : a link button inside a conversation
export async function GET(req, { params }) {
  const { code } = await params;

  if (code.includes('.')) {
    const [trackCode, stepId, idx] = code.split('.');
    const conv = await prisma.conversation.findUnique({ where: { trackCode }, include: { automation: true } });
    const step = conv && stepsOf(conv.automation).find((s) => s.id === stepId);
    const target = step?.buttons?.[Number(idx)]?.target;
    if (!target || !/^https?:\/\//i.test(target)) return new Response('This link is no longer available.', { status: 404 });
    await prisma.conversation.update({ where: { id: conv.id }, data: { clicks: { increment: 1 } } }).catch(() => {});
    await prisma.flowLog.create({ data: { conversationId: conv.id, kind: 'link', detail: step.buttons[Number(idx)].title } }).catch(() => {});
    return Response.redirect(target, 302);
  }

  const event = await prisma.event.findUnique({ where: { linkCode: code }, include: { automation: { select: { linkUrl: true, flow: true, type: true, requireFollow: true, dmMessage: true } } } });
  const target = event?.automation?.linkUrl;
  if (!target) return new Response('This link is no longer available.', { status: 404 });
  await prisma.event.update({
    where: { id: event.id },
    data: { clickCount: { increment: 1 }, ...(event.firstClickedAt ? {} : { firstClickedAt: new Date() }) },
  }).catch(() => {});
  // Count it on the conversation too (comment -> conversation with a tracked link)
  await prisma.conversation.updateMany({ where: { linkCode: code }, data: { clicks: { increment: 1 } } }).catch(() => {});
  return Response.redirect(target, 302);
}
