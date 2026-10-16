// Platform (super) admin: people listed in SUPER_ADMIN_EMAILS can open /admin.
import { redirect, notFound } from 'next/navigation';
import { NextResponse } from 'next/server';
import { prisma } from './db';
import { getSession } from './auth';

const admins = () => (process.env.SUPER_ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
export const isSuperAdmin = (email) => Boolean(email) && admins().includes(String(email).toLowerCase());

async function currentAdmin() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  return user && isSuperAdmin(user.email) ? user : null;
}

// Pages: sends non-admins away without revealing the admin area exists.
export async function requireAdminPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const admin = await currentAdmin();
  if (!admin) notFound();
  return admin;
}

export async function requireAdminApi() {
  const admin = await currentAdmin();
  if (!admin) return [null, NextResponse.json({ error: 'Not found' }, { status: 404 })];
  return [admin, null];
}

export async function adminLog(admin, action, { workspaceId = null, detail = null } = {}) {
  await prisma.adminLog.create({ data: { adminEmail: admin.email, workspaceId, action, detail } }).catch(() => {});
}
