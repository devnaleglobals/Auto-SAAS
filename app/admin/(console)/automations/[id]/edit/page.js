import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { hasSupportAccess } from '@/lib/supportAccess';
import Builder from '@/components/Builder';

export const dynamic = 'force-dynamic';

export default async function AdminEditAutomation({ params }) {
  await requireAdminPage('automations');
  const { id } = await params;
  const a = await prisma.automation.findUnique({ where: { id }, include: { channel: true, workspace: { select: { name: true, supportAccessUntil: true } } } });
  if (!a) notFound();
  if (!hasSupportAccess(a.workspace)) redirect(`/admin/automations/${id}?noaccess=1`);
  return (
    <>
      <Link href={`/admin/automations/${id}`} className="text-sm font-semibold text-slate hover:text-ink">← {a.name}</Link>
      <div className="my-4 rounded-xl border border-marigold/50 bg-marigold/10 px-4 py-3 text-sm">
        You’re editing <strong>{a.workspace.name}</strong>’s automation with their support access. Saving emails the client and shows in their Activity.
      </div>
      <Builder
        saveUrl={`/api/admin/automations/${a.id}`}
        doneUrl={`/admin/automations/${a.id}`}
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
    </>
  );
}
