import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import { PageHeader } from '@/components/ui';
import WelcomeMenuEditor from '@/components/WelcomeMenuEditor';

export default async function WelcomeMenu({ params }) {
  const ctx = await getContext();
  if (!ctx.can('manageAccounts')) redirect('/dashboard/accounts');
  const { id } = await params;
  const channel = await prisma.channel.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!channel) notFound();
  const flows = await prisma.automation.findMany({
    where: { channelId: channel.id, type: 'DM_FLOW', status: { not: 'COMPLETED' } },
    select: { id: true, name: true }, orderBy: { createdAt: 'desc' },
  });
  const isFb = channel.platform === 'FACEBOOK';
  return (
    <>
      <Link href="/dashboard/accounts" className="text-sm font-semibold text-slate hover:text-ink">← Accounts</Link>
      <div className="mt-5">
        <PageHeader title={`Welcome menu for ${isFb ? channel.username : `@${channel.username}`}`}
          description={`Up to 4 questions people can tap when they open a new chat with you on ${isFb ? 'Messenger' : 'Instagram'}. Each one starts a conversation you built.`} />
      </div>
      <WelcomeMenuEditor channelId={channel.id} isFb={isFb} flows={flows} initial={Array.isArray(channel.iceBreakers) ? channel.iceBreakers : []} />
    </>
  );
}
