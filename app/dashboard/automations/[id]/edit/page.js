import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import Builder from '@/components/Builder';

export default async function EditAutomation({ params }) {
  const ctx = await getContext();
  const { id } = await params;
  if (!ctx.can('editAutomations')) redirect(`/dashboard/automations/${id}`);
  const a = await prisma.automation.findFirst({ where: { id, workspaceId: ctx.workspace.id }, include: { channel: true } });
  if (!a) notFound();
  return (
    <Builder
      channels={[{ id: a.channel.id, platform: a.channel.platform, username: a.channel.username, picture: a.channel.picture }]}
      initial={{
        id: a.id, type: a.type, name: a.name, scope: a.scope,
        flow: a.flow, openerButton: a.openerButton, requireFollow: a.requireFollow,
        followPrompt: a.followPrompt, followButton: a.followButton, followRetry: a.followRetry,
        followUpMins: a.followUpMins, followUpText: a.followUpText, modHideLinks: a.modHideLinks, modAction: a.modAction, matchType: a.matchType, keywords: a.keywords, commentReplies: a.commentReplies,
        dmMessage: a.dmMessage, linkUrl: a.linkUrl || '', trackClicks: a.trackClicks,
        startAtISO: a.startAt?.toISOString() || null, endAtISO: a.endAt?.toISOString() || null, maxReplies: a.maxReplies ?? '',
        post: a.mediaId ? { id: a.mediaId, image: a.mediaThumb, caption: a.mediaCaption, permalink: a.mediaPermalink } : null,
      }}
    />
  );
}
