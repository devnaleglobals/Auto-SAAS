// Platform admin console: a separate login (/admin/login) with its own accounts (Admin table),
// its own cookie, a shorter session, optional 2-step verification, and roles.
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { prisma } from './db';
import { loadPlans } from './plans';

export const ADMIN_COOKIE = 'rr_admin';
const SESSION_HOURS = 8;
const key = () => {
  if (!process.env.AUTH_SECRET) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(process.env.AUTH_SECRET);
};

// What each role may do.
const PERMS = {
  OWNER: ['clients.view', 'clients.edit', 'billing', 'tickets', 'settings', 'emails', 'admins', 'danger'],
  ADMIN: ['clients.view', 'clients.edit', 'billing', 'tickets', 'settings', 'emails', 'danger'],
  SUPPORT: ['clients.view', 'tickets', 'emails'],
  BILLING: ['clients.view', 'billing'],
};
export const adminCan = (admin, perm) => Boolean(admin && PERMS[admin.role]?.includes(perm));
export const ROLE_LABEL = { OWNER: 'Owner', ADMIN: 'Admin', SUPPORT: 'Support', BILLING: 'Billing' };

export const adminCookieOpts = (maxAge) => ({
  httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge,
});

export async function adminSessionToken(admin) {
  return new SignJWT({ aid: admin.id, sv: admin.sessionVersion || 0 })
    .setProtectedHeader({ alg: 'HS256' }).setAudience('rr-admin').setIssuedAt().setExpirationTime(`${SESSION_HOURS}h`).sign(key());
}
export const ADMIN_SESSION_SECONDS = SESSION_HOURS * 3600;

// Short-lived ticket between "password OK" and "2-step code OK".
export async function twoFactorTicket(admin) {
  return new SignJWT({ aid: admin.id }).setProtectedHeader({ alg: 'HS256' }).setAudience('rr-admin-2fa').setIssuedAt().setExpirationTime('5m').sign(key());
}
export async function readTwoFactorTicket(t) {
  try { return (await jwtVerify(String(t || ''), key(), { audience: 'rr-admin-2fa', algorithms: ['HS256'] })).payload.aid; } catch { return null; }
}

export async function currentAdmin() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  let payload;
  try { payload = (await jwtVerify(token, key(), { audience: 'rr-admin', algorithms: ['HS256'] })).payload; } catch { return null; }
  const admin = await prisma.admin.findUnique({ where: { id: payload.aid } });
  if (!admin || !admin.active || (admin.sessionVersion || 0) !== (payload.sv || 0)) return null;
  await loadPlans();
  return admin;
}

// Pages: redirects to the admin login; with `perm`, shows a "no access" message instead.
export async function requireAdminPage(perm) {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login');
  if (perm && !adminCan(admin, perm)) redirect('/admin?denied=1');
  return admin;
}

export async function requireAdminApi(perm) {
  const admin = await currentAdmin();
  if (!admin) return [null, NextResponse.json({ error: 'Sign in to the admin console.' }, { status: 401 })];
  if (perm && !adminCan(admin, perm)) return [null, NextResponse.json({ error: 'Your admin role does not allow this.' }, { status: 403 })];
  return [admin, null];
}

export async function adminLog(admin, action, { workspaceId = null, detail = null } = {}) {
  await prisma.adminLog.create({ data: { adminEmail: admin.email, workspaceId, action, detail: detail ? String(detail).slice(0, 500) : null } }).catch(() => {});
}

// Emails of active admins (for new-ticket and system alerts when no support inbox is set).
export async function adminEmails(roles = ['OWNER', 'ADMIN', 'SUPPORT']) {
  const list = await prisma.admin.findMany({ where: { active: true, role: { in: roles } }, select: { email: true } });
  return list.map((a) => a.email);
}

// Strong password rule for admins.
export function adminPasswordProblem(pw) {
  const p = String(pw || '');
  if (p.length < 10) return 'Use at least 10 characters.';
  if (p.length > 72) return 'Use 72 characters or fewer.';
  if (!/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/\d/.test(p)) return 'Use upper and lower case letters and a number.';
  return null;
}
