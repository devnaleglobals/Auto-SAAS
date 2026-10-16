import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import AcceptInvite from '@/components/AcceptInvite';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }) {
  const { token } = await params;
  const inv = await prisma.invite.findUnique({ where: { token }, include: { workspace: true } });
  const session = await getSession();
  const valid = inv && !inv.acceptedAt && inv.expiresAt > new Date();
  const next = encodeURIComponent(`/invite/${token}`);
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-xl font-bold">ReplyRelay</Link>
        {!valid ? (
          <>
            <h1 className="mt-8 font-display text-3xl font-bold">This invite has expired</h1>
            <p className="mt-2 text-slate">Ask the person who invited you for a new link.</p>
          </>
        ) : (
          <>
            <h1 className="mt-8 font-display text-3xl font-bold">Join {inv.workspace.name}</h1>
            <p className="mt-2 text-slate">You've been invited as {inv.role.toLowerCase()}.</p>
            {session ? <AcceptInvite token={token} workspace={inv.workspace.name} role={inv.role.toLowerCase()} /> : (
              <div className="mt-8 space-y-3">
                <Link href={`/signup?next=${next}`} className="btn-dark w-full">Create an account to join</Link>
                <Link href={`/login?next=${next}`} className="btn-ghost w-full">I already have an account</Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
