import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from './db';
import { getSession } from './auth';

export const WS_COOKIE = 'rr_ws';

const RANK = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };
// What each role may do
const NEEDS = {
  view: 'VIEWER',
  editAutomations: 'MEMBER',
  manageAccounts: 'ADMIN',
  manageTeam: 'ADMIN',
  manageWorkspace: 'OWNER',
};
export const roleAllows = (role, perm) => RANK[role] >= RANK[NEEDS[perm]];

// Creates a workspace with the user as owner.
export async function createWorkspaceFor(user, name) {
  return prisma.workspace.create({
    data: { name: name || `${user.name.split(' ')[0]}'s workspace`, memberships: { create: { userId: user.id, role: 'OWNER' } } },
  });
}

// Returns { session, user, workspace, role, memberships } or null when signed out.
export async function getContext() {
  const session = await getSession();
  if (!session) return null;
  const memberships = await prisma.membership.findMany({
    where: { userId: session.uid },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  let user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) return null;
  if (memberships.length === 0) {
    const ws = await createWorkspaceFor(user);
    memberships.push({ workspaceId: ws.id, workspace: ws, role: 'OWNER' });
  }
  const store = await cookies();
  const wanted = store.get(WS_COOKIE)?.value;
  const current = memberships.find((m) => m.workspaceId === wanted) || memberships[0];
  return {
    session, user, memberships,
    workspace: current.workspace,
    role: current.role,
    can: (perm) => roleAllows(current.role, perm),
  };
}

// For API routes: returns [ctx, null] or [null, errorResponse].
export async function requireApi(perm = 'view') {
  const ctx = await getContext();
  if (!ctx) return [null, NextResponse.json({ error: 'Sign in first.' }, { status: 401 })];
  if (!ctx.can(perm)) return [null, NextResponse.json({ error: 'Your role does not allow this. Ask a workspace admin.' }, { status: 403 })];
  return [ctx, null];
}

export async function audit(ctx, action, detail) {
  await prisma.auditLog.create({ data: { workspaceId: ctx.workspace.id, userId: ctx.user?.id || null, action, detail: detail || null } }).catch(() => {});
}
