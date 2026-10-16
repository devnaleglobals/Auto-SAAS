// Instagram API with Instagram Login (Business/Creator accounts).
import { API_VERSION, appUrl, call, withToken } from './http';

const GRAPH = () => `https://graph.instagram.com/${API_VERSION()}`;
const COMMENT_FIELDS = 'id,text,timestamp,username,from,parent_id';

export const id = 'INSTAGRAM';
export const label = 'Instagram';
export const redirectUri = () => `${appUrl()}/api/instagram/callback`;
export const SCOPES = ['instagram_business_basic', 'instagram_business_manage_comments', 'instagram_business_manage_messages'];

export function authorizeUrl(state) {
  const p = new URLSearchParams({ client_id: process.env.IG_APP_ID, redirect_uri: redirectUri(), response_type: 'code', scope: SCOPES.join(','), state });
  return `https://www.instagram.com/oauth/authorize?${p}`;
}

// Exchanges the OAuth code. Returns { identity, channels: [channelData] }.
export async function completeOAuth(code) {
  const body = new URLSearchParams({
    client_id: process.env.IG_APP_ID,
    client_secret: process.env.IG_APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(),
    code: (code || '').replace(/#_$/, ''),
  });
  const raw = await call('https://api.instagram.com/oauth/access_token', { method: 'POST', body });
  const short = Array.isArray(raw.data) ? raw.data[0] : raw;

  const p = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: process.env.IG_APP_SECRET, access_token: short.access_token });
  const long = await call(`https://graph.instagram.com/access_token?${p}`);

  const profile = await call(withToken(`${GRAPH()}/me?fields=user_id,username,name,account_type,profile_picture_url,followers_count`, long.access_token));
  if (String(profile.account_type || '').toUpperCase() === 'PERSONAL') {
    const e = new Error('personal account'); e.reason = 'personal'; throw e;
  }
  const externalId = String(profile.user_id || profile.id);

  // Webhooks need Advanced Access; don't fail the connection if this is rejected.
  await call(withToken(`${GRAPH()}/me/subscribed_apps?subscribed_fields=comments,messages,messaging_postbacks`, long.access_token), { method: 'POST' })
    .catch((e) => console.warn('IG webhook subscribe failed:', e.message));

  return {
    identity: { platform: 'INSTAGRAM', externalId, name: profile.name || profile.username, email: null },
    channels: [{
      externalId,
      username: profile.username,
      name: profile.name || null,
      picture: profile.profile_picture_url || null,
      followers: profile.followers_count ?? null,
      token: long.access_token,
      tokenExpiresAt: new Date(Date.now() + (long.expires_in || 5184000) * 1000),
    }],
  };
}

export async function refreshToken(token) {
  const r = await call(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
  return { token: r.access_token, tokenExpiresAt: new Date(Date.now() + r.expires_in * 1000) };
}

// Posts in a common shape: { id, caption, image, permalink, timestamp, commentsCount, isVideo }
export async function listPosts(channel, token, after) {
  const p = new URLSearchParams({ fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count', limit: '24' });
  if (after) p.set('after', after);
  const data = await call(withToken(`${GRAPH()}/me/media?${p}`, token));
  return {
    items: (data.data || []).map((m) => ({
      id: m.id, caption: m.caption || '', image: m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url,
      permalink: m.permalink, timestamp: m.timestamp, commentsCount: m.comments_count ?? 0, isVideo: m.media_type === 'VIDEO',
    })),
    next: data.paging?.next ? data.paging?.cursors?.after : null,
  };
}

const toComment = (c) => ({
  id: c.id, text: c.text || '', timestamp: c.timestamp,
  fromId: c.from?.id || null, fromName: c.from?.username || c.username || null,
  isReply: Boolean(c.parent_id),
});

// Comments in a common shape. Tries two request types and follows pagination.
export async function listComments(channel, token, postId, maxPages = 10) {
  const media = await call(withToken(`${GRAPH()}/${postId}?fields=id,comments_count`, token));
  const seen = new Map();
  let url = withToken(`${GRAPH()}/${postId}/comments?fields=${COMMENT_FIELDS}&limit=50`, token);
  for (let page = 0; url && page < maxPages; page++) {
    const data = await call(url);
    for (const c of data.data || []) seen.set(c.id, c);
    url = data.paging?.next || null;
  }
  let method = 'comments edge';
  if (!seen.size) {
    method = 'none';
    try {
      const nested = await call(withToken(`${GRAPH()}/${postId}?fields=comments.limit(50){${COMMENT_FIELDS}}`, token));
      for (const c of nested.comments?.data || []) seen.set(c.id, c);
      if (seen.size) method = 'nested fields';
    } catch (e) { if (e.code === 190) throw e; }
  }
  return { comments: [...seen.values()].map(toComment), reportedCount: media.comments_count ?? null, method };
}

// Private reply = DM to the commenter. Once per comment, within 7 days.
export async function sendPrivateReply(channel, token, commentId, text) {
  return call(withToken(`${GRAPH()}/me/messages`, token), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text } }),
  });
}

export async function replyToComment(channel, token, commentId, message) {
  return call(withToken(`${GRAPH()}/${commentId}/replies?message=${encodeURIComponent(message)}`, token), { method: 'POST' });
}

// Webhook payload -> [{ externalId, postId, comment }]
export function parseWebhook(body) {
  if (body.object !== 'instagram') return [];
  const out = [];
  for (const entry of body.entry || []) {
    for (const ch of entry.changes || []) {
      if (ch.field !== 'comments' || !ch.value?.id || !ch.value?.media?.id) continue;
      const v = ch.value;
      out.push({
        externalId: String(entry.id),
        postId: v.media.id,
        comment: { id: v.id, text: v.text || '', timestamp: null, fromId: v.from?.id || null, fromName: v.from?.username || null, isReply: Boolean(v.parent_id) },
      });
    }
  }
  return out;
}

// ---- Messaging ----
export const supportsFollowCheck = true;

// recipient: { id } for a person in DMs, or { comment_id } for a private reply to a comment.
export async function sendMessage(channel, token, recipient, message) {
  return call(withToken(`${GRAPH()}/me/messages`, token), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient, message }),
  });
}

// Needs consent: works only after the person messaged the account or tapped a button.
export async function getContact(channel, token, contactId) {
  const p = await call(withToken(`${GRAPH()}/${contactId}?fields=name,username,is_user_follow_business`, token));
  return { username: p.username || p.name || null, follows: typeof p.is_user_follow_business === 'boolean' ? p.is_user_follow_business : null };
}

// Webhook "messaging" entries -> [{ externalId, contactId, mid, text, payload }]
export function parseMessaging(body) {
  if (body.object !== 'instagram') return [];
  const out = [];
  for (const entry of body.entry || []) {
    for (const m of entry.messaging || []) {
      if (m.message?.is_echo || m.message?.is_deleted) continue;
      const contactId = m.sender?.id;
      if (!contactId || contactId === String(entry.id)) continue;
      if (m.postback) out.push({ externalId: String(entry.id), contactId, mid: m.postback.mid || `pb_${contactId}_${m.timestamp}`, text: m.postback.title || '', payload: m.postback.payload || null });
      else if (m.message) out.push({
        externalId: String(entry.id), contactId, mid: m.message.mid, text: m.message.text || '', payload: m.message.quick_reply?.payload || null,
        storyReply: Boolean(m.message.reply_to?.story),
        storyMention: (m.message.attachments || []).some((x) => x.type === 'story_mention'),
      });
    }
  }
  return out;
}

// Welcome menu (ice breakers): up to 4 questions shown when someone opens a new chat.
export async function setIceBreakers(channel, token, items) {
  if (!items.length) {
    return call(withToken(`${GRAPH()}/me/messenger_profile`, token), {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'instagram', fields: ['ice_breakers'] }),
    });
  }
  return call(withToken(`${GRAPH()}/me/messenger_profile`, token), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform: 'instagram', ice_breakers: [{ call_to_actions: items.map((i) => ({ question: i.question, payload: i.payload })), locale: 'default' }] }),
  });
}

export async function hideComment(channel, token, commentId) {
  return call(withToken(`${GRAPH()}/${commentId}?hide=true`, token), { method: 'POST' });
}
export async function deleteComment(channel, token, commentId) {
  return call(withToken(`${GRAPH()}/${commentId}`, token), { method: 'DELETE' });
}
export const supportsStories = true;

// Fallback before webhook approval: recent messages people sent to this account.
export async function listRecentMessages(channel, token) {
  const data = await call(withToken(`${GRAPH()}/me/conversations?platform=instagram&fields=messages.limit(5){id,from,message,created_time}&limit=20`, token));
  const out = [];
  for (const conv of data.data || []) {
    for (const m of conv.messages?.data || []) {
      if (!m.from?.id || m.from.id === channel.externalId || m.from.username === channel.username) continue;
      out.push({ contactId: m.from.id, username: m.from.username || null, mid: m.id, text: m.message || '', payload: null, timestamp: m.created_time });
    }
  }
  return out;
}

export const profileUrl = (username) => `https://instagram.com/${username}`;
export const webhookSecret = () => process.env.IG_APP_SECRET;
