// Instagram API with Instagram Login (business/creator accounts).
// Docs: developers.facebook.com/docs/instagram-platform
const V = () => process.env.IG_API_VERSION || 'v23.0';
const GRAPH = () => `https://graph.instagram.com/${V()}`;

export const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
];

// Tolerates spaces, quotes and trailing slashes in APP_URL.
export const appUrl = () => (process.env.APP_URL || '').trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
export const redirectUri = () => `${appUrl()}/api/instagram/callback`;

export const isTokenError = (e) => e?.code === 190 || /access token/i.test(e?.message || '');

async function call(url, init) {
  const res = await fetch(url, { ...init, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data?.error?.message || data?.error_message || `Instagram API error ${res.status}`;
    const err = new Error(msg);
    err.code = data?.error?.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

const withToken = (url, token) => `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;

export function authorizeUrl(state) {
  const p = new URLSearchParams({
    client_id: process.env.IG_APP_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(','),
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${p}`;
}

export async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: process.env.IG_APP_ID,
    client_secret: process.env.IG_APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(),
    code: (code || '').replace(/#_$/, ''),
  });
  const data = await call('https://api.instagram.com/oauth/access_token', { method: 'POST', body });
  return Array.isArray(data.data) ? data.data[0] : data; // { access_token, user_id, permissions }
}

export async function toLongLived(shortToken) {
  const p = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: process.env.IG_APP_SECRET, access_token: shortToken });
  return call(`https://graph.instagram.com/access_token?${p}`); // { access_token, expires_in }
}

export async function refreshToken(token) {
  const p = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token });
  return call(`https://graph.instagram.com/refresh_access_token?${p}`);
}

export async function getProfile(token) {
  return call(withToken(`${GRAPH()}/me?fields=user_id,username,name,account_type,profile_picture_url,followers_count,media_count`, token));
}

export async function subscribeToWebhooks(token) {
  return call(withToken(`${GRAPH()}/me/subscribed_apps?subscribed_fields=comments`, token), { method: 'POST' });
}

export async function getMedia(token, after) {
  const p = new URLSearchParams({
    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count',
    limit: '24',
  });
  if (after) p.set('after', after);
  return call(withToken(`${GRAPH()}/me/media?${p}`, token));
}

const COMMENT_FIELDS = 'id,text,timestamp,username,from,parent_id';

// Pulls comments on a post using every method the API offers, following pagination.
// Returns { comments, reportedCount, method }.
//  - comments: list of top-level comments (newest first when Instagram provides them)
//  - reportedCount: comments_count Instagram shows on the post
//  - method: which request returned the data
export async function getAllComments(token, mediaId, maxPages = 10) {
  const media = await call(withToken(`${GRAPH()}/${mediaId}?fields=id,comments_count`, token));
  const reportedCount = media.comments_count ?? null;

  // Method 1: comments edge with pagination
  const seen = new Map();
  let url = withToken(`${GRAPH()}/${mediaId}/comments?fields=${COMMENT_FIELDS}&limit=50`, token);
  for (let page = 0; url && page < maxPages; page++) {
    const data = await call(url);
    for (const c of data.data || []) seen.set(c.id, c);
    url = data.paging?.next || null;
  }
  if (seen.size) return { comments: [...seen.values()], reportedCount, method: 'comments edge' };

  // Method 2: nested field expansion on the media object
  try {
    const nested = await call(withToken(`${GRAPH()}/${mediaId}?fields=comments.limit(50){${COMMENT_FIELDS}}`, token));
    for (const c of nested.comments?.data || []) seen.set(c.id, c);
  } catch (e) {
    if (isTokenError(e)) throw e;
  }
  if (seen.size) return { comments: [...seen.values()], reportedCount, method: 'nested fields' };

  return { comments: [], reportedCount, method: 'none' };
}

// Private reply: opens a DM with the commenter. Allowed once per comment, within 7 days.
export async function sendPrivateReply(token, commentId, text) {
  return call(withToken(`${GRAPH()}/me/messages`, token), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text } }),
  });
}

// Public reply under the comment.
export async function replyToComment(token, commentId, message) {
  const p = new URLSearchParams({ message });
  return call(withToken(`${GRAPH()}/${commentId}/replies?${p}`, token), { method: 'POST' });
}
