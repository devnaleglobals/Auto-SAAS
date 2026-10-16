// Platform registry. To add a new platform (e.g. YouTube), create lib/platforms/<name>.js
// exporting the same functions as instagram.js / facebook.js:
//   id, label, authorizeUrl(state), completeOAuth(code), refreshToken(token),
//   listPosts(channel, token, after), listComments(channel, token, postId),
//   sendPrivateReply(channel, token, commentId, text), replyToComment(channel, token, commentId, text),
//   parseWebhook(body), profileUrl(username), webhookSecret()
// then register it below and add the value to the Platform enum in prisma/schema.prisma.
import * as instagram from './instagram';
import * as facebook from './facebook';

export const platforms = { INSTAGRAM: instagram, FACEBOOK: facebook };
export const slugToPlatform = { instagram: 'INSTAGRAM', facebook: 'FACEBOOK' };

export function getPlatform(id) {
  const p = platforms[id];
  if (!p) throw new Error(`Unknown platform ${id}`);
  return p;
}

export { isTokenError, appUrl } from './http';
