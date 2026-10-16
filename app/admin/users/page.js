import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fmtDate } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function AdminUsers({ searchParams }) {
  const sp = await searchParams;
  const q = sp?.q?.trim();
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } : {},
    orderBy: { createdAt: 'desc' }, take: 300,
    include: { memberships: { include: { workspace: { select: { id: true, name: true } } } } },
  });
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Users</h1>
      <p className="mt-1 text-slate">Everyone who has signed in, and the workspaces they belong to.</p>
      <form className="my-6 flex gap-2"><input name="q" defaultValue={q} placeholder="Search name or email" className="field w-80" aria-label="Search users" /><button className="btn-dark">Search</button></form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-line"><tr><th className="th">Name</th><th className="th">Sign-in</th><th className="th">Workspaces</th><th className="th">Last login</th><th className="th">Joined</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line align-top last:border-0">
                <td className="td"><span className="font-semibold">{u.name}</span><span className="block text-xs text-slate">{u.email || 'No email'}</span></td>
                <td className="td">{u.passwordHash ? 'Email' : u.facebookId ? 'Facebook' : 'Instagram'}</td>
                <td className="td"><ul className="space-y-1">{u.memberships.map((m) => <li key={m.id} className="flex items-center gap-2"><Link href={`/admin/workspaces/${m.workspace.id}`} className="hover:underline">{m.workspace.name}</Link><StatusBadge s={m.role} /></li>)}</ul></td>
                <td className="td whitespace-nowrap text-slate">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : '–'}</td>
                <td className="td whitespace-nowrap text-slate">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
