import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './db';

const COOKIE = 'rr_session';
const secret = () => {
  const s = process.env.AUTH_SECRET || '';
  if (!s) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s);
};

// Cookie options shared by every cookie the app sets.
export const cookieOpts = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  ...(maxAge ? { maxAge } : {}),
});

// `sv` (session version) lets us sign a person out of every device by bumping User.sessionVersion.
export async function createSession(user) {
  const token = await new SignJWT({ uid: user.id, sv: user.sessionVersion || 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE, token, cookieOpts(60 * 60 * 24 * 7));
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return payload;
  } catch {
    return null;
  }
}

// Returns the session only if the user still exists and the session wasn't revoked.
export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload?.uid) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.uid }, select: { id: true, sessionVersion: true } });
  if (!user || (user.sessionVersion || 0) !== (payload.sv || 0)) return null;
  return payload;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

// Signs the person out everywhere, then (optionally) gives this browser a fresh session.
export async function revokeSessions(userId, { keepCurrent = false } = {}) {
  const user = await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  if (keepCurrent) await createSession(user);
  else await clearSession();
  return user;
}

export const SESSION_COOKIE = COOKIE;
