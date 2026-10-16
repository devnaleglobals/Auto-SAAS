const isUrl = (u) => /^https?:\/\/\S+$/i.test(u || '');

// Validates a conversation flow. Returns [flow, null] or [null, error].
export function validateFlow(flow) {
  const steps = Array.isArray(flow?.steps) ? flow.steps : [];
  if (steps.length === 0) return [null, 'Add at least one message to the conversation.'];
  if (steps.length > 20) return [null, 'A conversation can have up to 20 messages.'];
  const ids = new Set(steps.map((s) => s.id));
  if (ids.size !== steps.length) return [null, 'Two messages have the same ID. Delete one and add it again.'];
  const clean = [];
  for (const [i, s] of steps.entries()) {
    const label = `Message ${i + 1}`;
    const text = String(s.text || '').trim();
    const ask = s.ask && ['name', 'phone', 'email', 'custom'].includes(s.ask.field)
      ? { field: s.ask.field, label: String(s.ask.label || '').trim().slice(0, 60) || null } : null;
    if (!text && !ask) return [null, `${label} is empty.`];
    if (text.length > 640) return [null, `${label} is longer than 640 characters.`];
    const image = String(s.image || '').trim() || null;
    if (image && !isUrl(image)) return [null, `${label}: the image must be a link starting with https://`];
    const buttons = [];
    for (const b of (s.buttons || []).slice(0, 3)) {
      const title = String(b.title || '').trim();
      if (!title) return [null, `${label}: every button needs a label.`];
      if (title.length > 20) return [null, `${label}: button “${title}” is longer than 20 characters.`];
      if (b.action === 'url') {
        if (!isUrl(b.target)) return [null, `${label}: button “${title}” needs a link starting with https://`];
        buttons.push({ title, action: 'url', target: b.target.trim() });
      } else {
        if (!ids.has(b.target)) return [null, `${label}: choose which message button “${title}” goes to.`];
        if (b.target === s.id) return [null, `${label}: button “${title}” can't go to the same message.`];
        buttons.push({ title, action: 'step', target: b.target });
      }
    }
    if (ask && buttons.length) return [null, `${label} asks a question, so it can't have buttons. The answer moves the conversation on.`];
    if (ask?.field === 'custom' && !ask.label) return [null, `${label}: name the question (for example “Size”), so you can find the answers in Leads.`];
    const next = s.next && ids.has(s.next) && s.next !== s.id ? s.next : null;
    clean.push({ id: String(s.id).slice(0, 40), name: String(s.name || '').slice(0, 40) || null, text, image, buttons, next, ask });
  }
  return [{ steps: clean }, null];
}

// Validates automation input from the builder. Returns [data, null] or [null, errorMessage].
const TYPES = ['COMMENT_REPLY', 'COMMENT_DM', 'DM_FLOW', 'STORY_REPLY', 'STORY_MENTION', 'COMMENT_MODERATION'];
const FLOW_ONLY = ['DM_FLOW', 'STORY_REPLY', 'STORY_MENTION'];
const INSTAGRAM_ONLY = ['STORY_REPLY', 'STORY_MENTION'];

// Validates automation input from the builder. Returns [data, null] or [null, errorMessage].
export function validateAutomation(b, { requireTarget = true, platform = 'INSTAGRAM' } = {}) {
  const type = TYPES.includes(b.type) ? b.type : 'COMMENT_DM';
  if (INSTAGRAM_ONLY.includes(type) && platform !== 'INSTAGRAM') return [null, 'Story automations work on Instagram only.'];
  const isComment = ['COMMENT_REPLY', 'COMMENT_DM', 'COMMENT_MODERATION'].includes(type);
  const scope = !isComment ? 'ALL_POSTS' : b.scope === 'ALL_POSTS' ? 'ALL_POSTS' : 'POST';
  if (isComment && requireTarget && scope === 'POST' && !b.mediaId) return [null, 'Choose a post, or choose "All posts".'];

  let matchType = ['CONTAINS', 'EXACT', 'ANY'].includes(b.matchType) ? b.matchType : 'CONTAINS';
  if (type === 'STORY_MENTION') matchType = 'ANY';
  if (type === 'COMMENT_MODERATION') matchType = 'CONTAINS';
  const keywords = [...new Set((b.keywords || []).map((k) => String(k).trim()).filter(Boolean))].slice(0, 100);
  const modHideLinks = type === 'COMMENT_MODERATION' && Boolean(b.modHideLinks);
  if (type === 'COMMENT_MODERATION') {
    if (!keywords.length && !modHideLinks) return [null, 'Add blocked words, or turn on hiding comments with links.'];
  } else if (matchType !== 'ANY' && keywords.length === 0) return [null, 'Add at least one keyword.'];
  if (['COMMENT_REPLY', 'COMMENT_DM'].includes(type) && scope === 'ALL_POSTS' && matchType === 'ANY') return [null, '"Any comment" on all posts would reply to everyone. Add keywords instead.'];

  const commentReplies = ['COMMENT_REPLY', 'COMMENT_DM'].includes(type) ? (b.commentReplies || []).map((r) => String(r).trim()).filter(Boolean).slice(0, 10) : [];
  if (type === 'COMMENT_REPLY' && commentReplies.length === 0) return [null, 'Add at least one public reply.'];

  const useFlow = FLOW_ONLY.includes(type) || (type === 'COMMENT_DM' && b.useFlow);
  let flow = null;
  if (useFlow) {
    const [f, err] = validateFlow(b.flow);
    if (err) return [null, err];
    flow = f;
  }

  const dmMessage = type === 'COMMENT_DM' ? String(b.dmMessage || '').trim() : '';
  if (type === 'COMMENT_DM' && !dmMessage) return [null, 'Write the first private message.'];
  const linkUrl = type === 'COMMENT_DM' && !useFlow ? String(b.linkUrl || '').trim() || null : null;
  if (linkUrl && !isUrl(linkUrl)) return [null, 'The link must start with http:// or https://'];
  if (dmMessage.length + (linkUrl ? 40 : 0) > 900) return [null, 'The message is too long (900 characters max).'];

  const canFollow = useFlow || (type === 'COMMENT_DM');
  const requireFollow = canFollow && platform === 'INSTAGRAM' && Boolean(b.requireFollow);
  const followPrompt = String(b.followPrompt || '').trim().slice(0, 640) || null;
  const followRetry = String(b.followRetry || '').trim().slice(0, 640) || null;
  const followButton = String(b.followButton || '').trim() || null;
  if (followButton && followButton.length > 20) return [null, 'The follow button label must be 20 characters or less.'];
  const openerButton = String(b.openerButton || '').trim() || null;
  if (openerButton && openerButton.length > 20) return [null, 'The first button label must be 20 characters or less.'];

  const followUpMins = useFlow && b.followUpMins ? parseInt(b.followUpMins, 10) : null;
  if (followUpMins !== null && (isNaN(followUpMins) || followUpMins < 15 || followUpMins > 1320)) return [null, 'Send the reminder between 15 minutes and 22 hours later.'];
  const followUpText = followUpMins ? String(b.followUpText || '').trim().slice(0, 640) || null : null;

  const startAt = b.startAt ? new Date(b.startAt) : null;
  const endAt = b.endAt ? new Date(b.endAt) : null;
  if ((startAt && isNaN(startAt)) || (endAt && isNaN(endAt))) return [null, 'Check the start and stop dates.'];
  if (startAt && endAt && endAt <= startAt) return [null, 'The stop date must be after the start date.'];
  const maxReplies = b.maxReplies && type !== 'COMMENT_MODERATION' ? parseInt(b.maxReplies, 10) : null;
  if (maxReplies !== null && (isNaN(maxReplies) || maxReplies < 1)) return [null, 'The limit must be 1 or more.'];

  return [{
    type, scope, keywords, matchType, commentReplies,
    name: String(b.name || '').trim().slice(0, 80) || null,
    dmMessage, linkUrl,
    trackClicks: b.trackClicks !== false,
    flow, openerButton: useFlow && type === 'COMMENT_DM' ? openerButton : null,
    requireFollow, followPrompt, followRetry, followButton,
    followUpMins, followUpText,
    modHideLinks, modAction: type === 'COMMENT_MODERATION' ? (b.modAction === 'DELETE' ? 'DELETE' : 'HIDE') : null,
    startAt, endAt, maxReplies,
  }, null];
}
