// Facebook Pages via Facebook Login for Business.
import { API_VERSION, appUrl, call, withToken } from './http';

const GRAPH = () => `https://graph.facebook.com/${API_VERSION()}`;

export const id = 'FACEBOOK';
export const label = 'Facebook';
export const redirectUri = () => `${appUrl()}/api/facebook/callback`;
export const SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
  'pages_manage_engagement',
  'pages_manage_metadata',
  'pages_messaging',
];

// If FB_CONFIG_ID is set (a Facebook Login for Business configuration), it is used instead of the scope list.
export function authorizeUrl(state) {
  const p = new URLSearchParams({ client_id: process.env.FB_APP_ID, redirect_uri: redirectUri(), state, response_type: 'code' });
  if (process.env.FB_CONFIG_ID) p.set('config_id', process.env.FB_CONFIG_ID);
  else p.set('scope', SCOPES.join(','));
  return `https://www.facebook.com/${API_VERSION()}/dialog/oauth?${p}`;
}

const PAGE_FIELDS = 'id,name,access_token,picture{url},followers_count,fan_count';

// Returns { identity, channels } — one channel per Page the person granted.
export async function completeOAuth(code) {
  const p = new URLSearchParams({ client_id: process.env.FB_APP_ID, client_secret: process.env.FB_APP_SECRET, redirect_uri: redirectUri(), code });
  const short = await call(`${GRAPH()}/oauth/access_token?${p}`);
  const lp = new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: process.env.FB_APP_ID, client_secret: process.env.FB_APP_SECRET, fb_exchange_token: short.access_token });
  const long = await call(`${GRAPH()}/oauth/access_token?${lp}`);
  const userToken = long.access_token;

  const me = await call(withToken(`${GRAPH()}/me?fields=id,name,email`, userToken));

  // 1. Normal way: Pages the person manages.
  let pages = [];
  try {
    const res = await call(withToken(`${GRAPH()}/me/accounts?fields=${PAGE_FIELDS}&limit=100`, userToken));
    pages = res.data || [];
  } catch (e) {
    console.warn('me/accounts failed:', e.message);
  }

  // 2. Pages in a Business portfolio: read the granted Page IDs from the token, then load each Page.
  if (pages.length === 0) {
    const appToken = `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`;
    const dbg = await call(`${GRAPH()}/debug_token?input_token=${encodeURIComponent(userToken)}&access_token=${encodeURIComponent(appToken)}`);
    const ids = new Set();
    for (const g of dbg.data?.granular_scopes || []) {
      if (String(g.scope).startsWith('pages_')) for (const t of g.target_ids || []) ids.add(String(t));
    }
    if (ids.size === 0) console.warn('No Page IDs in granted scopes:', JSON.stringify(dbg.data?.granular_scopes || []));
    for (const pageId of ids) {
      try {
        pages.push(await call(withToken(`${GRAPH()}/${pageId}?fields=${PAGE_FIELDS}`, userToken)));
      } catch (e) {
        console.warn('Page load failed:', pageId, e.message);
      }
    }
  }

  const channels = [];
  for (const pg of pages) {
    if (!pg.access_token) {
      console.warn('No Page access token for', pg.id, pg.name);
      continue;
    }
    // Page tokens obtained from a long-lived user token do not expire.
    await call(withToken(`${GRAPH()}/${pg.id}/subscribed_apps?subscribed_fields=feed,messages,messaging_postbacks`, pg.access_token), { method: 'POST' })
      .catch((e) => console.warn('FB page subscribe failed:', pg.name, e.message));
    channels.push({
      externalId: pg.id,
      username: pg.name,
      name: pg.name,
      picture: pg.picture?.data?.url || null,
      followers: pg.followers_count ?? pg.fan_count ?? null,
      token: pg.access_token,
      tokenExpiresAt: null,
    });
  }
  return { identity: { platform: 'FACEBOOK', externalId: me.id, name: me.name, email: me.email || null }, channels };
}

export async function refreshToken() {
  return null; // Page tokens don't expire; a Reconnect is needed only if the person removes access.
}

export async function listPosts(channel, token, after) {
  const p = new URLSearchParams({ fields: 'id,message,full_picture,permalink_url,created_time,comments.summary(true).limit(0)', limit: '24' });
  if (after) p.set('after', after);
  let data = await call(withToken(`${GRAPH()}/${channel.externalId}/posts?${p}`, token));
  // Newer Pages sometimes return posts only from these edges.
  for (const edge of ['published_posts', 'feed']) {
    if ((data.data || []).length || after) break;
    data = await call(withToken(`${GRAPH()}/${channel.externalId}/${edge}?${p}`, token)).catch(() => data);
  }
  return {
    items: (data.data || []).map((m) => ({
      id: m.id, caption: m.message || '', image: m.full_picture || null, permalink: m.permalink_url,
      timestamp: m.created_time, commentsCount: m.comments?.summary?.total_count ?? 0, isVideo: false,
    })),
    next: data.paging?.next ? data.paging?.cursors?.after : null,
  };
}

export async function listComments(channel, token, postId, maxPages = 10) {
  const seen = new Map();
  let reportedCount = null;
  let url = withToken(`${GRAPH()}/${postId}/comments?fields=id,message,created_time,from,parent&filter=toplevel&order=reverse_chronological&summary=true&limit=50`, token);
  for (let page = 0; url && page < maxPages; page++) {
    const data = await call(url);
    if (reportedCount === null) reportedCount = data.summary?.total_count ?? null;
    for (const c of data.data || []) seen.set(c.id, c);
    url = data.paging?.next || null;
  }
  const comments = [...seen.values()].map((c) => ({
    id: c.id, text: c.message || '', timestamp: c.created_time,
    fromId: c.from?.id || null, fromName: c.from?.name || null, isReply: Boolean(c.parent),
  }));
  return { comments, reportedCount, method: comments.length ? 'comments edge' : 'none' };
}

export async function replyToComment(channel, token, commentId, message) {
  return call(withToken(`${GRAPH()}/${commentId}/comments?message=${encodeURIComponent(message)}`, token), { method: 'POST' });
}

export function parseWebhook(body) {
  if (body.object !== 'page') return [];
  const out = [];
  for (const entry of body.entry || []) {
    for (const ch of entry.changes || []) {
      const v = ch.value || {};
      if (ch.field !== 'feed' || v.item !== 'comment' || v.verb !== 'add' || !v.comment_id) continue;
      out.push({
        externalId: String(entry.id),
        postId: v.post_id,
        comment: {
          id: v.comment_id, text: v.message || '', timestamp: v.created_time ? new Date(v.created_time * 1000).toISOString() : null,
          fromId: v.from?.id || null, fromName: v.from?.name || null,
          isReply: Boolean(v.parent_id && v.parent_id !== v.post_id),
        },
      });
    }
  }
  return out;
}

// ---- Messaging (Messenger) ----
export const supportsFollowCheck = false; // Meta doesn't expose Page likes/follows for a person

// recipient: { id } for a person in Messenger, or { comment_id } for a private reply to a comment.
export async function sendMessage(channel, token, recipient, message) {
  return call(withToken(`${GRAPH()}/${channel.externalId}/messages`, token), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient, message, ...(recipient.id ? { messaging_type: 'RESPONSE' } : {}) }),
  });
}

export async function getContact(channel, token, contactId) {
  try {
    const p = await call(withToken(`${GRAPH()}/${contactId}?fields=name`, token));
    return { username: p.name || null, follows: null };
  } catch {
    return { username: null, follows: null };
  }
}

export function parseMessaging(body) {
  if (body.object !== 'page') return [];
  const out = [];
  for (const entry of body.entry || []) {
    for (const m of entry.messaging || []) {
      if (m.message?.is_echo) continue;
      const contactId = m.sender?.id;
      if (!contactId || contactId === String(entry.id)) continue;
      if (m.postback) out.push({ externalId: String(entry.id), contactId, mid: m.postback.mid || `pb_${contactId}_${m.timestamp}`, text: m.postback.title || '', payload: m.postback.payload || null });
      else if (m.message) out.push({ externalId: String(entry.id), contactId, mid: m.message.mid, text: m.message.text || '', payload: m.message.quick_reply?.payload || null });
    }
  }
  return out;
}

export async function setIceBreakers(channel, token, items) {
  if (!items.length) {
    return call(withToken(`${GRAPH()}/me/messenger_profile`, token), {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: ['ice_breakers'] }),
    });
  }
  return call(withToken(`${GRAPH()}/me/messenger_profile`, token), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ice_breakers: [{ call_to_actions: items.map((i) => ({ question: i.question, payload: i.payload })), locale: 'default' }] }),
  });
}

export async function hideComment(channel, token, commentId) {
  return call(withToken(`${GRAPH()}/${commentId}?is_hidden=true`, token), { method: 'POST' });
}
export async function deleteComment(channel, token, commentId) {
  return call(withToken(`${GRAPH()}/${commentId}`, token), { method: 'DELETE' });
}
export const supportsStories = false;

// Fallback before webhook approval: recent messages people sent to this Page.
export async function listRecentMessages(channel, token) {
  const data = await call(withToken(`${GRAPH()}/${channel.externalId}/conversations?fields=messages.limit(5){id,from,message,created_time}&limit=20`, token));
  const out = [];
  for (const conv of data.data || []) {
    for (const m of conv.messages?.data || []) {
      if (!m.from?.id || m.from.id === channel.externalId) continue;
      out.push({ contactId: m.from.id, username: m.from.name || null, mid: m.id, text: m.message || '', payload: null, timestamp: m.created_time });
    }
  }
  return out;
}

export const profileUrl = () => null;
export const webhookSecret = () => process.env.FB_APP_SECRET;
