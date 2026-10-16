import { prisma } from './db';
import { decrypt } from './crypto';
import crypto from 'crypto';
import { getPlatform, isTokenError, appUrl } from './platforms';
import { hasFlow, payload, checkInbox, handleInbound } from './flows';
import { canSend, recordSend, LIMIT_NOTE } from './usage';
import { alertReconnect } from './notify';

const newLinkCode = () => crypto.randomBytes(5).toString('base64url');

const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

export function matchKeyword(automation, text) {
  const t = normalize(text);
  if (automation.matchType === 'ANY') return '*';
  for (const kw of automation.keywords) {
    const k = normalize(kw);
    if (!k) continue;
    if (automation.matchType === 'EXACT' && t === k) return kw;
    if (automation.matchType === 'CONTAINS') {
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u');
      if (re.test(t)) return kw;
    }
  }
  return null;
}

const LINK_RE = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|in|net|org|io|co|me|link|xyz|shop|store)\b/i;
function moderationHit(a, text) {
  if (a.modHideLinks && LINK_RE.test(text || '')) return 'link';
  const kw = a.keywords.length ? matchKeyword({ ...a, matchType: 'CONTAINS' }, text) : null;
  return kw && kw !== '*' ? kw : null;
}

const inWindow = (a, now) => !(a.startAt && now < a.startAt) && !(a.endAt && now > a.endAt);

async function flagReconnect(channelId) {
  await prisma.channel.update({ where: { id: channelId }, data: { needsReconnect: true } }).catch(() => {});
  await alertReconnect(channelId).catch(() => {});
}

// Handles one comment (from a webhook or the checker).
// comment = { id, text, fromId, fromName, isReply }
export async function handleComment(channel, postId, comment) {
  if (!comment?.id || !postId) return { skipped: 'missing ids' };
  if (comment.isReply) return { skipped: 'thread reply' };
  if (comment.fromId && comment.fromId === channel.externalId) return { skipped: 'own comment' };
  if (comment.fromName && channel.platform === 'INSTAGRAM' && comment.fromName === channel.username) return { skipped: 'own comment' };

  const now = new Date();

  // Moderation runs first: a hidden or deleted comment gets no replies.
  const mods = await prisma.automation.findMany({
    where: { channelId: channel.id, status: 'ACTIVE', type: 'COMMENT_MODERATION', OR: [{ scope: 'POST', mediaId: postId }, { scope: 'ALL_POSTS' }] },
    orderBy: { createdAt: 'asc' },
  });
  for (const m of mods) {
    if (!inWindow(m, now)) continue;
    const reason = moderationHit(m, comment.text);
    if (!reason) continue;
    let event;
    try {
      event = await prisma.event.create({ data: { automationId: m.id, commentId: comment.id, postId, commenterId: comment.fromId, commenterUsername: comment.fromName, commentText: comment.text || '', matchedKeyword: reason, dmStatus: 'SKIPPED' } });
    } catch (e) { if (e.code === 'P2002') return { skipped: 'duplicate' }; throw e; }
    const platform = getPlatform(channel.platform);
    const token = decrypt(channel.accessTokenEnc);
    const del = m.modAction === 'DELETE';
    try {
      await (del ? platform.deleteComment : platform.hideComment)(channel, token, comment.id);
      await prisma.event.update({ where: { id: event.id }, data: { replyStatus: del ? 'DELETED' : 'HIDDEN' } });
    } catch (e) {
      await prisma.event.update({ where: { id: event.id }, data: { replyStatus: 'FAILED', replyError: e.message.slice(0, 500) } });
      if (isTokenError(e)) await flagReconnect(channel.id);
    }
    await prisma.automation.update({ where: { id: m.id }, data: { replyCount: { increment: 1 } } });
    return { processed: event.id, moderated: del ? 'deleted' : 'hidden' };
  }

  // Post-specific automations win over "all posts" ones; oldest first within each group.
  const found = await prisma.automation.findMany({
    where: { channelId: channel.id, status: 'ACTIVE', type: { in: ['COMMENT_REPLY', 'COMMENT_DM'] }, OR: [{ scope: 'POST', mediaId: postId }, { scope: 'ALL_POSTS' }] },
    orderBy: { createdAt: 'asc' },
  });
  const candidates = [...found.filter((a) => a.scope === 'POST'), ...found.filter((a) => a.scope === 'ALL_POSTS')];

  let automation = null;
  let matched = null;
  for (const a of candidates) {
    if (a.endAt && now > a.endAt) {
      await prisma.automation.update({ where: { id: a.id }, data: { status: 'COMPLETED' } });
      continue;
    }
    if (!inWindow(a, now)) continue;
    const m = matchKeyword(a, comment.text);
    if (m) { automation = a; matched = m; break; }
  }
  if (!automation) return { skipped: 'no matching automation' };
  if (!(await canSend(channel.workspaceId))) {
    await prisma.automation.update({ where: { id: automation.id }, data: { lastCheckNote: LIMIT_NOTE, lastCheckedAt: new Date() } }).catch(() => {});
    return { skipped: 'plan limit' };
  }

  let event;
  try {
    event = await prisma.event.create({
      data: {
        automationId: automation.id,
        commentId: comment.id,
        postId,
        linkCode: automation.type === 'COMMENT_DM' && automation.linkUrl && automation.trackClicks ? newLinkCode() : null,
        commenterId: comment.fromId,
        commenterUsername: comment.fromName,
        commentText: comment.text || '',
        matchedKeyword: matched === '*' ? null : matched,
      },
    });
  } catch (e) {
    if (e.code === 'P2002') return { skipped: 'duplicate' };
    throw e;
  }

  if (automation.maxReplies) {
    const reserved = await prisma.automation.updateMany({
      where: { id: automation.id, replyCount: { lt: automation.maxReplies } },
      data: { replyCount: { increment: 1 } },
    });
    if (reserved.count === 0) {
      await prisma.event.update({ where: { id: event.id }, data: { dmStatus: 'SKIPPED', replyStatus: 'SKIPPED', dmError: 'Reply limit reached' } });
      await prisma.automation.update({ where: { id: automation.id }, data: { status: 'COMPLETED' } });
      return { skipped: 'limit reached' };
    }
  } else {
    await prisma.automation.update({ where: { id: automation.id }, data: { replyCount: { increment: 1 } } });
  }

  const platform = getPlatform(channel.platform);
  const token = decrypt(channel.accessTokenEnc);
  const update = {};

  if (automation.type === 'COMMENT_REPLY') {
    update.dmStatus = 'SKIPPED';
  } else if (hasFlow(automation)) {
    // Opener with a button: tapping it gives Meta consent, then the flow (and follow check) runs.
    const opener = {
      attachment: { type: 'template', payload: { template_type: 'button', text: automation.dmMessage.slice(0, 640),
        buttons: [{ type: 'postback', title: (automation.openerButton || 'Send it to me').slice(0, 20), payload: payload(automation.id, 'START', event.linkCode || '') }] } },
    };
    try {
      await platform.sendMessage(channel, token, { comment_id: comment.id }, opener);
      update.dmStatus = 'SENT';
    } catch (e) {
      // Some accounts reject buttons in the first private reply: fall back to text the person can answer.
      try {
        const word = automation.keywords[0] || 'yes';
        await platform.sendMessage(channel, token, { comment_id: comment.id }, { text: `${automation.dmMessage}\n\nReply "${word}" here to continue.` });
        update.dmStatus = 'SENT';
      } catch (e2) {
        update.dmStatus = 'FAILED';
        update.dmError = e2.message.slice(0, 500);
        if (isTokenError(e2)) await flagReconnect(channel.id);
      }
    }
  } else {
    const link = event.linkCode ? `${appUrl()}/l/${event.linkCode}` : automation.linkUrl;
    const dmText = link ? `${automation.dmMessage}\n\n${link}` : automation.dmMessage;
    try {
      await platform.sendMessage(channel, token, { comment_id: comment.id }, { text: dmText });
      update.dmStatus = 'SENT';
    } catch (e) {
      update.dmStatus = 'FAILED';
      update.dmError = e.message.slice(0, 500);
      if (isTokenError(e)) await flagReconnect(channel.id);
    }
  }

  const replies = automation.commentReplies.filter(Boolean);
  if (replies.length) {
    const replyText = replies[Math.floor(Math.random() * replies.length)];
    update.replyText = replyText;
    try {
      await platform.replyToComment(channel, token, comment.id, replyText);
      update.replyStatus = 'SENT';
    } catch (e) {
      update.replyStatus = 'FAILED';
      update.replyError = e.message.slice(0, 500);
    }
  } else {
    update.replyStatus = 'SKIPPED';
  }

  await prisma.event.update({ where: { id: event.id }, data: update });
  const sentCount = (update.dmStatus === 'SENT' ? 1 : 0) + (update.replyStatus === 'SENT' ? 1 : 0);
  if (sentCount) await recordSend(channel.workspaceId, sentCount);

  if (automation.maxReplies) {
    const fresh = await prisma.automation.findUnique({ where: { id: automation.id }, select: { replyCount: true } });
    if (fresh.replyCount >= automation.maxReplies) {
      await prisma.automation.update({ where: { id: automation.id }, data: { status: 'COMPLETED' } });
    }
  }
  return { processed: event.id, ...update };
}

// Webhook entry point for DMs and button taps: items = platform.parseMessaging(body)
export async function handleMessagingItems(platformId, items) {
  for (const item of items) {
    const channel = await prisma.channel.findUnique({ where: { platform_externalId: { platform: platformId, externalId: item.externalId } } });
    if (!channel) continue;
    await handleInbound(channel, item).catch((e) => console.error('handleInbound failed', e));
  }
}

// Webhook entry point: items = platform.parseWebhook(body)
export async function handleWebhookItems(platformId, items) {
  for (const item of items) {
    const channel = await prisma.channel.findUnique({ where: { platform_externalId: { platform: platformId, externalId: item.externalId } } });
    if (!channel) continue;
    await handleComment(channel, item.postId, item.comment).catch((e) => console.error('handleComment failed', e));
  }
}

// Reads the post's comments and processes new ones. Safe to run repeatedly.
export async function checkAutomation(automationId) {
  const a = await prisma.automation.findUnique({ where: { id: automationId }, include: { channel: true } });
  if (!a || a.status !== 'ACTIVE') return { checked: 0, reported: null, processed: 0, note: 'Automation is not running.' };

  const save = (note) => prisma.automation.update({ where: { id: a.id }, data: { lastCheckedAt: new Date(), lastCheckNote: note } });
  if (['DM_FLOW', 'STORY_REPLY', 'STORY_MENTION'].includes(a.type)) {
    try {
      const r = await checkInbox(a.channel);
      const note = `Read ${r.read} recent messages; handled ${r.handled} new.`;
      await save(note);
      return { checked: r.read, processed: r.handled, note };
    } catch (e) {
      const note = `Couldn't read messages: ${e.message}`;
      await save(note);
      return { checked: 0, processed: 0, note, error: true };
    }
  }
  const platform = getPlatform(a.channel.platform);
  const token = decrypt(a.channel.accessTokenEnc);

  let posts;
  let result = { comments: [], reportedCount: 0, method: 'none' };
  try {
    if (a.scope === 'ALL_POSTS') {
      const recent = await platform.listPosts(a.channel, token);
      posts = recent.items.slice(0, 10).map((p) => p.id); // the 10 newest posts
    } else {
      posts = [a.mediaId];
    }
    for (const postId of posts) {
      const r = await platform.listComments(a.channel, token, postId);
      result.comments.push(...r.comments.map((c) => ({ ...c, postId })));
      result.reportedCount += r.reportedCount || 0;
      if (r.method !== 'none') result.method = r.method;
    }
  } catch (e) {
    const note = isTokenError(e)
      ? `The ${platform.label} connection for ${a.channel.username} has expired. Open Accounts and click Reconnect.`
      : `${platform.label} returned an error: ${e.message}`;
    if (isTokenError(e)) await flagReconnect(a.channel.id);
    await save(note);
    return { checked: 0, reported: null, processed: 0, note, error: true };
  }

  if (a.channel.needsReconnect) await prisma.channel.update({ where: { id: a.channel.id }, data: { needsReconnect: false } });

  const since = new Date(Math.max(a.createdAt.getTime(), a.startAt ? a.startAt.getTime() : 0) - 60_000);
  let processed = 0;
  let newer = 0;
  for (const c of result.comments) {
    if (c.timestamp && new Date(c.timestamp) < since) continue;
    newer++;
    const r = await handleComment(a.channel, c.postId, c);
    if (r.processed) processed++;
  }

  let note;
  if (result.comments.length === 0 && (result.reportedCount ?? 0) > 0) {
    note = `${platform.label} shows ${result.reportedCount} comments on the selected post(s) but shared 0 with the app. Meta only shares comment data once the app has Advanced Access (App Review). No code change is needed.`;
  } else if (processed > 0) {
    note = `Replied to ${processed} new comment${processed > 1 ? 's' : ''}.`;
  } else {
    note = `Read ${result.comments.length} comments (${newer} since the automation started). Nothing new to reply to.`;
  }
  await save(note);
  return { checked: result.comments.length, reported: result.reportedCount, processed, note, method: result.method };
}
