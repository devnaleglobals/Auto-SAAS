import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import Builder from '@/components/Builder';
import PlatformIcon from '@/components/PlatformIcon';
import { PageHeader } from '@/components/ui';
import { PLATFORMS, typesFor } from '@/lib/automationTypes';

function Trail({ platform, type }) {
  return (
    <nav aria-label="Steps" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate">
      <Link href="/dashboard/automations/new" className="font-semibold hover:text-ink">Platform</Link>
      {platform && <><span aria-hidden>/</span><Link href={`/dashboard/automations/new?platform=${platform}`} className="font-semibold hover:text-ink">{PLATFORMS[platform].title}</Link></>}
      {type && <><span aria-hidden>/</span><span className="text-ink">{typesFor(platform)[type].title}</span></>}
    </nav>
  );
}

export default async function NewAutomation({ searchParams }) {
  const ctx = await getContext();
  if (!ctx.can('editAutomations')) redirect('/dashboard/automations');
  const all = await prisma.channel.findMany({
    where: { workspaceId: ctx.workspace.id },
    select: { id: true, platform: true, username: true, picture: true },
    orderBy: { connectedAt: 'asc' },
  });
  if (all.length === 0) redirect('/dashboard/accounts');

  const sp = await searchParams;
  const fromAccount = all.find((c) => c.id === sp?.account);
  const platform = PLATFORMS[sp?.platform] ? sp.platform : fromAccount?.platform || null;
  const accountQ = fromAccount ? `&account=${fromAccount.id}` : '';

  // Step 1: platform
  if (!platform) {
    return (
      <>
        <Trail />
        <PageHeader title="New automation" description="Where should it run?" />
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(PLATFORMS).map(([key, p]) => {
            const accounts = all.filter((c) => c.platform === key);
            const body = (
              <>
                <span className="flex items-center gap-3"><PlatformIcon platform={key} className="h-7 w-7" /><span className="font-display text-xl font-bold">{p.title}</span></span>
                <span className="mt-3 text-sm text-slate">{p.blurb}</span>
                <span className="mt-4 text-sm">
                  {accounts.length
                    ? <>Connected: <strong>{accounts.map((c) => (key === 'INSTAGRAM' ? `@${c.username}` : c.username)).join(', ')}</strong></>
                    : <span className="text-slate">No account connected yet.</span>}
                </span>
                <span className="mt-5 text-sm font-semibold group-hover:underline">{accounts.length ? 'Choose' : `Connect ${p.title}`}</span>
              </>
            );
            return accounts.length
              ? <Link key={key} href={`/dashboard/automations/new?platform=${key}`} className="card group flex flex-col p-6 transition-colors hover:border-ink">{body}</Link>
              : <a key={key} href={p.connect} className="card group flex flex-col border-dashed p-6 transition-colors hover:border-ink">{body}</a>;
          })}
        </div>
      </>
    );
  }

  const channels = all.filter((c) => c.platform === platform);
  if (channels.length === 0) redirect(PLATFORMS[platform].connect);
  const types = typesFor(platform);
  const type = types[sp?.type] ? sp.type : null;

  // Step 3: builder
  if (type) {
    return (
      <>
        <Trail platform={platform} type={type} />
        <Builder channels={channels} type={type} initialChannelId={fromAccount?.platform === platform ? fromAccount.id : undefined} />
      </>
    );
  }

  // Step 2: what should happen
  return (
    <>
      <Trail platform={platform} />
      <PageHeader title="What should happen?" description={`Automations for your ${PLATFORMS[platform].title} ${platform === 'FACEBOOK' ? 'Pages' : 'accounts'}.`} />
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(types).map(([key, t]) => (
          <Link key={key} href={`/dashboard/automations/new?platform=${platform}&type=${key}${accountQ}`} className="card group flex flex-col p-6 transition-colors hover:border-ink">
            <span className="font-display text-xl font-bold">{t.title}</span>
            <span className="mt-2 text-sm text-slate">{t.blurb}</span>
            <span className="mt-4 rounded-lg bg-canvas p-3 text-sm">{t.example}</span>
            <span className="mt-5 text-sm font-semibold group-hover:underline">Set it up</span>
          </Link>
        ))}
      </div>
    </>
  );
}
