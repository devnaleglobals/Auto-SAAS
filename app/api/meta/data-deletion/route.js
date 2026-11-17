import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { parseSignedRequest } from '@/lib/meta';
import { deleteChannel, deleteUserAccount } from '@/lib/account';
import { appUrl } from '@/lib/platforms';
import { sendMail } from '@/lib/mailer';
import { adminEmails } from '@/lib/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Meta "Data deletion request callback". Set this URL in:
//  - App dashboard → App settings → Basic → Data deletion → "Data deletion callback URL" (Facebook)
//  - Instagram → API setup with Instagram business login → Business login settings → "Data deletion request URL"
// Deletes what we hold for that person and returns a status link + confirmation code, as Meta requires.
export async function POST(req) {
  const sr = await parseSignedRequest(req);
  if (!sr) return NextResponse.json({ error: 'Invalid signed_request' }, { status: 400 });

  const code = crypto.randomBytes(8).toString('hex').toUpperCase();
  const request = await prisma.deletionRequest.create({ data: { code, platform: sr.platform, externalId: sr.userId } });

  let detail = '';
  let found = false;
  if (sr.platform === 'FACEBOOK') {
    const user = await prisma.user.findUnique({ where: { facebookId: sr.userId } });
    if (user) {
      found = true;
      const pages = await prisma.channel.findMany({ where: { platform: 'FACEBOOK', connectedById: user.id } });
      for (const c of pages) await deleteChannel(c);
      detail = `${pages.length} Facebook Page connection(s) deleted`;
      if (!user.passwordHash) {
        // Signed in only with Facebook: delete the ReplyRelay account too.
        const r = await deleteUserAccount(user.id);
        detail += `; account and ${r.workspacesDeleted} owned workspace(s) deleted`;
      } else {
        await prisma.user.update({ where: { id: user.id }, data: { facebookId: null } });
        detail += '; Facebook sign-in removed from the account';
      }
    }
  } else {
    const channels = await prisma.channel.findMany({ where: { platform: 'INSTAGRAM', externalId: sr.userId } });
    if (channels.length) {
      found = true;
      for (const c of channels) await deleteChannel(c);
      detail = `${channels.length} Instagram account connection(s) deleted with their automations, logs and leads`;
    }
  }

  await prisma.deletionRequest.update({
    where: { id: request.id },
    data: found ? { status: 'COMPLETED', detail, completedAt: new Date() } : { status: 'NOT_FOUND', detail: 'No data linked to this account was found.', completedAt: new Date() },
  });

  // Tell the platform team, so anything outside the database (emails, backups) can be checked by hand.
  const admins = await adminEmails(['OWNER', 'ADMIN']);
  if (admins.length) {
    await sendMail({ to: admins, kind: 'system', subject: `Meta data deletion request ${code}`, text: `Platform: ${sr.platform}\nMeta user ID: ${sr.userId}\nResult: ${found ? detail : 'nothing found'}\nStatus page: ${appUrl()}/data-deletion/status?code=${code}` }).catch(() => {});
  }

  return NextResponse.json({ url: `${appUrl()}/data-deletion/status?code=${code}`, confirmation_code: code });
}
