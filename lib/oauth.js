import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from './db';
import { encrypt } from './crypto';
import { createSession, cookieOpts } from './auth';
import { getContext, createWorkspaceFor, roleAllows, audit, WS_COOKIE } from './context';
import { getPlatform } from './platforms';
import { limitsOf, loadPlans } from './plans';
import { getSignupSettings } from './settings';

const STATE_COOKIE = 'oauth_state';

// Only same-site paths: blocks redirects to other websites (including //evil.com and /\\evil.com).
export const safeNext = (p) => typeof p === 'string' && /^\/(?![\/\\])/.test(p) && !/[\r\n]/.test(p) ? p : null;

export function startOAuth(platformId, req) {
  const platform = getPlatform(platformId);
  const state = crypto.randomBytes(16).toString('hex');
  const res = NextResponse.redirect(platform.authorizeUrl(state));
  res.cookies.set(STATE_COOKIE, state, cookieOpts(600));
  const next = req ? new URL(req.url).searchParams.get('next') : null;
  if (safeNext(next)) res.cookies.set('rr_next', next, cookieOpts(600));
  return res;
}

// Signed in  -> connects the account(s) to the current workspace (Admin or Owner).
// Signed out -> signs in the person who already owns these accounts, or creates a user + workspace.
export async function finishOAuth(platformId, req) {
  const url = new URL(req.url);
  const ctx = await getContext();
  const go = (path) => NextResponse.redirect(new URL(path, req.url));
  const fail = (q) => go(ctx ? `/dashboard/accounts?${q}` : `/login?${q}`);

  if (url.searchParams.get('error')) return fail('connect=denied');
  const state = url.searchParams.get('state');
  const expected = req.cookies.get(STATE_COOKIE)?.value;
  if (!state || !expected || state.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expected))) return fail('connect=state');
  if (ctx && !roleAllows(ctx.role, 'manageAccounts')) return fail('connect=role');

  let result;
  try {
    result = await getPlatform(platformId).completeOAuth(url.searchParams.get('code'));
  } catch (e) {
    if (e.reason === 'personal') return fail('connect=personal');
    console.error(`${platformId} OAuth failed`, e);
    return fail(`connect=error&reason=${encodeURIComponent(e.message)}`);
  }
  if (result.channels.length === 0) return fail('connect=nopages');

  let userId = ctx?.user.id;
  let workspaceId = ctx?.workspace.id;

  if (!ctx) {
    // Returning user? Find by an already-connected account, then by Facebook identity / email.
    const known = await prisma.channel.findFirst({
      where: { platform: platformId, externalId: { in: result.channels.map((c) => c.externalId) } },
    });
    if (known) {
      const m = (known.connectedById && await prisma.membership.findUnique({ where: { userId_workspaceId: { userId: known.connectedById, workspaceId: known.workspaceId } }, include: { user: true } }))
        || await prisma.membership.findFirst({ where: { workspaceId: known.workspaceId }, orderBy: { createdAt: 'asc' }, include: { user: true } });
      // Instagram: signing in with the account itself proves ownership.
      // Facebook: a Page can have many admins, so only sign in as the person who connected it (same Facebook ID).
      const samePerson = platformId !== 'FACEBOOK' || !m?.user?.facebookId || m.user.facebookId === result.identity.externalId;
      if (m && samePerson) { workspaceId = known.workspaceId; userId = m.userId; }
    }
    if (!userId && platformId === 'FACEBOOK') {
      const u = await prisma.user.findUnique({ where: { facebookId: result.identity.externalId } })
        || (result.identity.email && await prisma.user.findUnique({ where: { email: result.identity.email.toLowerCase() } }));
      if (u) userId = u.id;
    }
    if (!userId && !(await getSignupSettings()).signupOpen) return fail('connect=closed');
    if (!userId) {
      const user = await prisma.user.create({
        data: {
          name: result.identity.name || 'New user',
          email: result.identity.email ? result.identity.email.toLowerCase() : null,
          facebookId: platformId === 'FACEBOOK' ? result.identity.externalId : null,
          termsAcceptedAt: new Date(), // the sign-in page states that continuing accepts the Terms and Privacy Policy
        },
      });
      userId = user.id;
    }
    if (!workspaceId) {
      const m = await prisma.membership.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
      workspaceId = m?.workspaceId || (await createWorkspaceFor(await prisma.user.findUnique({ where: { id: userId } }))).id;
    }
  }
  if (platformId === 'FACEBOOK') {
    await prisma.user.updateMany({ where: { id: userId, facebookId: null }, data: { facebookId: result.identity.externalId } }).catch(() => {});
  }

  const who = await prisma.user.findUnique({ where: { id: userId }, select: { disabled: true } });
  if (who?.disabled) return fail('connect=disabled');
  await loadPlans();

  let connected = 0;
  let overLimit = 0;
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  let count = await prisma.channel.count({ where: { workspaceId } });
  for (const c of result.channels) {
    const key = { platform_externalId: { platform: platformId, externalId: c.externalId } };
    const existing = await prisma.channel.findUnique({ where: key });
    if (existing && existing.workspaceId !== workspaceId) continue; // belongs to another workspace
    if (!existing) {
      if (count >= limitsOf(ws).accounts) { overLimit++; continue; }
      count++;
    }
    const data = {
      workspaceId, connectedById: userId, username: c.username, name: c.name, picture: c.picture, followers: c.followers,
      accessTokenEnc: encrypt(c.token), tokenExpiresAt: c.tokenExpiresAt, needsReconnect: false,
    };
    await prisma.channel.upsert({ where: key, create: { platform: platformId, externalId: c.externalId, ...data }, update: data });
    connected++;
  }

  const actor = { workspace: { id: workspaceId }, user: { id: userId } };
  if (connected) await audit(actor, 'account.connected', `${getPlatform(platformId).label}: ${result.channels.map((c) => c.username).join(', ')}`);

  if (!ctx) {
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } }).catch(() => {});
    await createSession(await prisma.user.findUnique({ where: { id: userId } }));
  }
  const next = safeNext(req.cookies.get('rr_next')?.value);
  const res = go(overLimit && !connected ? '/dashboard/accounts?connect=limit'
    : connected ? (ctx ? `/dashboard/accounts?connect=${overLimit ? 'partial' : 'ok'}` : next || '/dashboard?connect=ok') : `/dashboard/accounts?connect=taken`);
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete('rr_next');
  res.cookies.set(WS_COOKIE, workspaceId, cookieOpts(60 * 60 * 24 * 365));
  return res;
}
