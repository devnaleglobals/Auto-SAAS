// Shared by server pages and the client builder (kept out of 'use client' files on purpose).
const INFO = {
  INSTAGRAM: {
    COMMENT_REPLY: { title: 'Comment reply', blurb: 'Reply publicly under matching comments. No private message.', example: '“Great reel!” → “Thank you! 🙏” under their comment' },
    COMMENT_DM: { title: 'Comment to DM', blurb: 'Comment a keyword, get a private message, optionally a full conversation.', example: '“link” → private message with your link, or a conversation with buttons' },
    DM_FLOW: { title: 'DM conversation', blurb: 'Someone messages a keyword and a conversation with buttons starts.', example: '“price” in DMs → “What are you looking for?” [Sarees] [Kurtis] [Talk to us]' },
    STORY_REPLY: { title: 'Story reply', blurb: 'Someone replies to your story with a keyword and a conversation starts.', example: 'Story reply “want” → “Here’s how to order 👇” [Order now]' },
    STORY_MENTION: { title: 'Story mention', blurb: 'Someone mentions you in their story and gets an automatic thank-you.', example: 'Mention @you → “Thanks for the shoutout! Here’s 10% off 🎁”' },
    COMMENT_MODERATION: { title: 'Comment moderation', blurb: 'Hide or delete comments with blocked words or links.', example: '“scam”, spam links → hidden automatically' },
  },
  FACEBOOK: {
    COMMENT_REPLY: { title: 'Comment reply', blurb: 'Reply publicly under matching comments on your Page posts.', example: '“Nice!” → “Thank you! 🙏” under their comment' },
    COMMENT_DM: { title: 'Comment to Messenger', blurb: 'Comment a keyword, get a Messenger message, optionally a full conversation.', example: '“menu” → Messenger message with your menu link, or a conversation with buttons' },
    DM_FLOW: { title: 'Messenger conversation', blurb: 'Someone messages your Page a keyword and a conversation with buttons starts.', example: '“order” in Messenger → “What would you like?” [Cakes] [Brownies] [Call us]' },
    COMMENT_MODERATION: { title: 'Comment moderation', blurb: 'Hide or delete comments with blocked words or links on your Page posts and ads.', example: '“scam”, spam links → hidden automatically' },
  },
};

export const PLATFORMS = {
  INSTAGRAM: { title: 'Instagram', blurb: 'Business or Creator accounts. Comments, DMs, and the follow check.', connect: '/api/instagram/connect' },
  FACEBOOK: { title: 'Facebook', blurb: 'Facebook Pages. Comments on Page posts and Messenger.', connect: '/api/facebook/connect' },
};

export const typeInfo = (type, platform = 'INSTAGRAM') => (INFO[platform] || INFO.INSTAGRAM)[type];
export const typesFor = (platform = 'INSTAGRAM') => INFO[platform] || INFO.INSTAGRAM;
// Back-compat: Instagram wording
export const TYPE_INFO = INFO.INSTAGRAM;

export const FLOW_TYPES = ['DM_FLOW', 'STORY_REPLY', 'STORY_MENTION'];
export const COMMENT_TYPES = ['COMMENT_REPLY', 'COMMENT_DM', 'COMMENT_MODERATION'];
