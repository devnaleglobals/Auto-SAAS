'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlatformIcon from './PlatformIcon';
import FlowEditor, { FollowSettings, FollowUpSettings, blankStep } from './FlowEditor';
import { useFeedback, Spinner } from './Feedback';

import { typeInfo, FLOW_TYPES, COMMENT_TYPES } from '@/lib/automationTypes';

function Step({ n, title, children, hint }) {
  return (
    <section className="card p-6">
      <h2 className="flex items-baseline gap-3 font-display text-lg font-bold">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm text-white">{n}</span>{title}
      </h2>
      {hint && <p className="ml-10 mt-1 text-sm text-slate">{hint}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function ListInput({ id, values, setValues, placeholder, max = 10 }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const next = [...values];
    for (const v of draft.split(',').map((x) => x.trim()).filter(Boolean)) if (!next.includes(v) && next.length < max) next.push(v);
    setValues(next); setDraft('');
  };
  return (
    <div>
      <div className="flex gap-2">
        <input id={id} className="field" value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" onClick={add} className="btn-ghost shrink-0">Add</button>
      </div>
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((v) => (
            <li key={v} className="flex items-center gap-2 rounded-full bg-ink px-3 py-1 text-sm text-white">
              {v}<button type="button" aria-label={`Remove ${v}`} onClick={() => setValues(values.filter((x) => x !== v))} className="text-white/60 hover:text-white">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function Bubble({ me, children }) {
  return <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${me ? 'ml-auto rounded-br-sm bg-ink text-white' : 'rounded-bl-sm bg-white'}`}>{children}</div>;
}
function Buttons({ items }) {
  if (!items?.length) return null;
  return <div className="ml-auto w-[85%] space-y-1">{items.map((b, i) => <div key={i} className="rounded-xl border border-line bg-white px-3 py-1.5 text-center text-sm font-semibold text-sky">{b.title || 'Button'}{b.action === 'url' && ' ↗'}</div>)}</div>;
}

export default function Builder({ channels, initial, type: typeProp, initialChannelId }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const editing = Boolean(initial?.id);
  const type = initial?.type || typeProp || 'COMMENT_DM';
  const isComment = COMMENT_TYPES.includes(type);
  const isFlowType = FLOW_TYPES.includes(type);
  const isMod = type === 'COMMENT_MODERATION';
  const isMention = type === 'STORY_MENTION';
  const replyTypes = type === 'COMMENT_REPLY' || type === 'COMMENT_DM';

  const [channelId, setChannelId] = useState(channels.find((c) => c.id === initialChannelId)?.id || channels[0].id);
  const [scope, setScope] = useState(initial?.scope || 'POST');
  const [media, setMedia] = useState([]);
  const [next, setNext] = useState(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [post, setPost] = useState(initial?.post || null);

  const [name, setName] = useState(initial?.name || '');
  const [matchType, setMatchType] = useState(initial?.matchType || 'CONTAINS');
  const [keywords, setKeywords] = useState(initial?.keywords || []);
  const [commentReplies, setCommentReplies] = useState(initial?.commentReplies || (type === 'COMMENT_DM' ? ['Sent it to your DMs 📩', 'Check your inbox 👀'] : type === 'COMMENT_REPLY' ? ['Thank you! 🙏'] : []));
  const [dmMessage, setDmMessage] = useState(initial?.dmMessage ?? 'Hey! Thanks for your comment 🙌 Tap below and I’ll send it to you.');
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl || '');
  const [trackClicks, setTrackClicks] = useState(initial?.trackClicks ?? true);
  const [useFlow, setUseFlow] = useState(isFlowType || Boolean(initial?.flow?.steps?.length));
  const [steps, setSteps] = useState(initial?.flow?.steps?.map((s) => ({ ...s, image: s.image || '', name: s.name || '' })) || [blankStep({ DM_FLOW: 'Hi! 👋 How can we help you today?', STORY_REPLY: 'Thanks for replying to our story! 🙌 Here’s how to order 👇', STORY_MENTION: 'Thank you for the shoutout! 💛 Here’s a little thank-you gift 🎁' }[type] || 'Here you go! 👇')]);
  const [openerButton, setOpenerButton] = useState(initial?.openerButton || 'Send it to me');
  const [follow, setFollow] = useState({
    requireFollow: initial?.requireFollow || false,
    followPrompt: initial?.followPrompt || 'Please follow us to continue 🙏 Then tap the button below.',
    followButton: initial?.followButton || "I've followed ✅",
    followRetry: initial?.followRetry || "We still can't see your follow 🙈 Follow us, then tap the button again.",
  });
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [maxReplies, setMaxReplies] = useState(initial?.maxReplies ?? '');
  const [followUp, setFollowUp] = useState({ followUpMins: initial?.followUpMins ?? null, followUpText: initial?.followUpText || 'Just checking in 👋 Here’s the link again in case you missed it.' });
  const [modHideLinks, setModHideLinks] = useState(initial?.modHideLinks ?? true);
  const [modAction, setModAction] = useState(initial?.modAction || 'HIDE');
  const [confirmed, setConfirmed] = useState(editing);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setStartAt(toLocalInput(initial?.startAtISO)); setEndAt(toLocalInput(initial?.endAtISO)); }, [initial?.startAtISO, initial?.endAtISO]);

  const reqRef = useRef(0);
  async function loadMedia(after) {
    const req = ++reqRef.current; // ignore answers from an account that is no longer selected
    setLoadingMedia(true); setMediaError('');
    const res = await fetch(`/api/channels/${channelId}/posts${after ? `?after=${after}` : ''}`);
    const data = await res.json().catch(() => ({}));
    if (req !== reqRef.current) return;
    setLoadingMedia(false);
    if (!res.ok) return setMediaError(data.error || 'Could not load posts.');
    setMedia((m) => (after ? [...m, ...data.items] : data.items));
    setNext(data.next);
  }
  useEffect(() => {
    if (editing || !isComment) return;
    setPost(null); setMedia([]); loadMedia();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [channelId]);

  const account = channels.find((c) => c.id === channelId);
  const isFb = account.platform === 'FACEBOOK';
  const flowOn = isFlowType || (type === 'COMMENT_DM' && useFlow);
  const followOn = follow.requireFollow && !isFb && (flowOn || type === 'COMMENT_DM');
  const sample = matchType === 'ANY' ? 'Hi' : keywords[0] || 'link';
  const ready = (!isComment || scope === 'ALL_POSTS' || post) && (isMention || matchType === 'ANY' || keywords.length > 0 || (isMod && modHideLinks)) && confirmed
    && (type !== 'COMMENT_DM' || dmMessage.trim()) && (type !== 'COMMENT_REPLY' || commentReplies.length > 0);

  async function submit() {
    setBusy(true); setError('');
    const payload = {
      type, channelId, name, scope, matchType, keywords, commentReplies, dmMessage, linkUrl, trackClicks,
      useFlow: flowOn, flow: flowOn ? { steps } : null, openerButton,
      ...(flowOn ? followUp : { followUpMins: null }), modHideLinks, modAction,
      ...follow, requireFollow: followOn,
      startAt: startAt ? new Date(startAt).toISOString() : null,
      endAt: endAt ? new Date(endAt).toISOString() : null,
      maxReplies: maxReplies || null,
      mediaId: post?.id, mediaPermalink: post?.permalink, mediaCaption: post?.caption, mediaThumb: post?.image,
    };
    const res = await fetch(editing ? `/api/automations/${initial.id}` : '/api/automations', {
      method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || 'Something went wrong.');
      toast(data.error || 'Something went wrong.', 'bad');
      return;
    }
    toast(editing ? 'Changes saved' : 'Automation started');
    router.push(`/dashboard/automations/${editing ? initial.id : data.id}`);
    router.refresh();
  }

  let n = 0;
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
      <div>

        <h1 className="font-display text-3xl font-bold tracking-tight">{editing ? 'Edit automation' : typeInfo(type, account.platform).title}</h1>
        <p className="mt-1.5 text-slate">{typeInfo(type, account.platform).blurb}</p>

        <div className="mt-8 space-y-5">
          <Step n={++n} title={isComment ? 'Choose the post' : 'Choose the account'}>
            {!editing && channels.length === 1 && (
              <p className="text-sm text-slate">Account: <strong className="text-ink">{channels[0].platform === 'INSTAGRAM' ? `@${channels[0].username}` : channels[0].username}</strong></p>
            )}
            {!editing && channels.length > 1 && (
              <div>
                <p className="label" id="acc-label">Account</p>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby="acc-label">
                  {channels.map((c) => {
                    const on = c.id === channelId;
                    return (
                      <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setChannelId(c.id)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${on ? 'border-ink bg-white ring-1 ring-ink' : 'border-line bg-white hover:border-slate/60'}`}>
                        <span className="relative shrink-0">
                          {c.picture ? <img src={c.picture} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="block h-9 w-9 rounded-full bg-canvas" />}
                          <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5"><PlatformIcon platform={c.platform} className="h-3.5 w-3.5" /></span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{c.platform === 'INSTAGRAM' ? `@${c.username}` : c.username}</span>
                          <span className="block text-xs text-slate">{c.platform === 'FACEBOOK' ? 'Facebook Page' : 'Instagram'}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {!isComment && <p className="text-sm text-slate">Runs on {type === 'STORY_REPLY' ? 'replies to the stories of' : isMention ? 'story mentions of' : isFb ? 'Messenger messages to' : 'direct messages to'} <strong className="text-ink">{account.username}</strong>.</p>}
            {isComment && editing && <p className="text-sm text-slate">{scope === 'ALL_POSTS' ? 'Runs on all posts' : 'Runs on one post'} of <strong className="text-ink">{account.username}</strong>. To change this, duplicate the automation.</p>}
            {isComment && !editing && (
              <>
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Where it runs">
                  {[['POST', 'One post', isFb ? 'Pick a specific Page post.' : 'Pick a specific post or reel.'], ['ALL_POSTS', 'All posts', 'Every post, including future ones.']].map(([v, t, d]) => (
                    <button key={v} type="button" role="radio" aria-checked={scope === v} onClick={() => setScope(v)}
                      className={`rounded-lg border p-4 text-left transition ${scope === v ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-slate'}`}>
                      <span className="block font-semibold">{t}</span><span className="text-sm text-slate">{d}</span>
                    </button>
                  ))}
                </div>
                {scope === 'POST' && (
                  <>
                    {mediaError && <p className="text-sm text-bad">{mediaError}</p>}
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                      {media.map((m) => {
                        const on = post?.id === m.id;
                        return (
                          <button type="button" key={m.id} onClick={() => setPost(m)} aria-pressed={on}
                            className={`relative aspect-square animate-fade-in overflow-hidden rounded-lg bg-canvas ring-offset-2 transition-[box-shadow,transform] duration-150 ${on ? 'scale-[.97] ring-4 ring-marigold' : 'hover:ring-2 hover:ring-line'}`}>
                            {m.image ? <img src={m.image} alt={m.caption?.slice(0, 80) || 'Post'} className="h-full w-full object-cover" /> : <span className="block p-2 text-left text-xs">{m.caption?.slice(0, 60)}</span>}
                            <span className="absolute bottom-1 right-1 rounded bg-ink/80 px-1.5 text-[11px] text-white">{m.commentsCount ?? 0} 💬</span>
                          </button>
                        );
                      })}
                    </div>
                    {loadingMedia && (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5" aria-label="Loading posts">
                        {Array.from({ length: media.length ? 5 : 10 }).map((_, i) => <div key={i} className="skeleton aspect-square" />)}
                      </div>
                    )}
                    {!loadingMedia && media.length === 0 && !mediaError && <p className="text-sm text-slate">{isFb ? 'No posts found on this Page. Posts on your personal profile don’t count, only posts published as the Page.' : 'No posts found on this account.'}</p>}
                    {next && !loadingMedia && <button type="button" className="btn-ghost" onClick={() => loadMedia(next)}>Load older posts</button>}
                  </>
                )}
              </>
            )}
          </Step>

          {isMod && (
            <Step n={++n} title="Choose what to remove">
              <div><label className="label" htmlFor="kw">Blocked words</label>
                <ListInput id="kw" values={keywords} setValues={setKeywords} placeholder="scam, fake, abusive words…" max={100} />
                <p className="hint">Any comment containing one of these words is removed. Add spellings and Hindi or Marathi variants too.</p></div>
              <label className="flex items-start gap-3 rounded-lg border border-line p-4">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-ink" checked={modHideLinks} onChange={(e) => setModHideLinks(e.target.checked)} />
                <span><span className="block font-semibold">Also remove comments with links</span><span className="text-sm text-slate">Catches spam like “earn money at cheapdeals.in”.</span></span>
              </label>
              <div><p className="label">What to do</p>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="What to do">
                  {[['HIDE', 'Hide', 'Only the commenter and their friends still see it. Reversible.'], ['DELETE', 'Delete', 'Removed for everyone. Can’t be undone.']].map(([v, t, d]) => (
                    <button key={v} type="button" role="radio" aria-checked={modAction === v} onClick={() => setModAction(v)}
                      className={`rounded-lg border p-3 text-left ${modAction === v ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-slate/60'}`}>
                      <span className="block font-semibold">{t}</span><span className="text-sm text-slate">{d}</span>
                    </button>
                  ))}
                </div></div>
            </Step>
          )}

          {!isMod && !isMention && (
          <Step n={++n} title={isComment ? 'Choose which comments trigger it' : type === 'STORY_REPLY' ? 'Choose which story replies start it' : 'Choose which messages start it'}>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Trigger">
              {[['CONTAINS', isComment ? 'Comment contains a keyword' : 'Message contains a keyword'], ['EXACT', 'Exactly the keyword'], ['ANY', isComment ? 'Any comment' : type === 'STORY_REPLY' ? 'Any story reply' : 'Any message']].map(([v, l]) => (
                <button type="button" role="radio" aria-checked={matchType === v} key={v} onClick={() => setMatchType(v)}
                  disabled={v === 'ANY' && isComment && scope === 'ALL_POSTS'}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-40 ${matchType === v ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{l}</button>
              ))}
            </div>
            {matchType !== 'ANY' && (
              <div><label className="label" htmlFor="kw">Keywords</label>
                <ListInput id="kw" values={keywords} setValues={setKeywords} placeholder={isComment ? 'link, price, info' : 'price, catalogue, hi'} max={30} />
                <p className="hint">Not case-sensitive. Separate several with commas. Include Hindi or Marathi words your audience uses, like “link chahiye”.</p></div>
            )}
          </Step>
          )}

          {type === 'COMMENT_DM' && (
            <Step n={++n} title="Write the private message">
              <div><label className="label" htmlFor="dm">{flowOn ? 'First message (sent privately to the commenter)' : 'Private message'}</label>
                <textarea id="dm" rows={3} className="field" value={dmMessage} onChange={(e) => setDmMessage(e.target.value)} maxLength={640} />
                <p className="hint">{dmMessage.length}/640 · Sent {isFb ? 'in Messenger' : 'as an Instagram DM'}.</p></div>
              <label className="flex items-start gap-3 rounded-lg border border-line p-4">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-ink" checked={useFlow} onChange={(e) => setUseFlow(e.target.checked)} />
                <span><span className="block font-semibold">Continue as a conversation with buttons</span>
                  <span className="text-sm text-slate">The first message gets a button. When they tap it, your conversation starts. Needed for the follow check.</span></span>
              </label>
              {useFlow ? (
                <div><label className="label" htmlFor="ob">Button on the first message</label>
                  <input id="ob" className="field max-w-xs" value={openerButton} maxLength={20} onChange={(e) => setOpenerButton(e.target.value)} />
                  {follow.requireFollow && !isFb && <p className="hint">Link buttons in your conversation that use the link below get click tracking.</p>}</div>
              ) : (
                <div><label className="label" htmlFor="link">Link (optional)</label>
                  <input id="link" className="field" placeholder="https://" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-ink" checked={trackClicks} onChange={(e) => setTrackClicks(e.target.checked)} />
                    Track clicks (sends a short tracked link and shows who clicked)
                  </label></div>
              )}
            </Step>
          )}

          {flowOn && (
            <Step n={++n} title="Build the conversation" hint="Each message can have up to 3 buttons. A button either goes to another message or opens a link.">
              <FlowEditor steps={steps} setSteps={setSteps} />
            </Step>
          )}

          {flowOn && (
            <Step n={++n} title="Reminder">
              <FollowUpSettings value={followUp} onChange={setFollowUp} />
            </Step>
          )}

          {(flowOn || type === 'COMMENT_DM') && (
            <Step n={++n} title="Follow check">
              <FollowSettings value={follow} onChange={(v) => { setFollow(v); if (v.requireFollow && type === 'COMMENT_DM' && !useFlow) setUseFlow(true); }} platform={account.platform} />
            </Step>
          )}

          {replyTypes && (
            <Step n={++n} title={type === 'COMMENT_REPLY' ? 'Write the public replies' : 'Public replies under the comment'}>
              <div><label className="label" htmlFor="rep">Replies</label>
                <ListInput id="rep" values={commentReplies} setValues={setCommentReplies} placeholder={type === 'COMMENT_REPLY' ? 'Thanks for watching! 🙌' : 'Check your DMs!'} />
                <p className="hint">One is picked at random each time so replies don't look copy-pasted.{type === 'COMMENT_DM' && ' Leave empty to skip public replies.'}</p></div>
            </Step>
          )}

          <Step n={++n} title="Set limits">
            <div><label className="label" htmlFor="name">Automation name</label>
              <input id="name" className="field" placeholder={isMod ? 'Spam filter' : isMention ? 'Story thank-you' : type === 'DM_FLOW' ? 'Price enquiries' : 'Diwali sale reel'} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="label" htmlFor="start">Start</label><input id="start" type="datetime-local" className="field" value={startAt} onChange={(e) => setStartAt(e.target.value)} /><p className="hint">Empty means now</p></div>
              <div><label className="label" htmlFor="end">Stop</label><input id="end" type="datetime-local" className="field" value={endAt} onChange={(e) => setEndAt(e.target.value)} /><p className="hint">Empty means never</p></div>
              {!isMod && <div><label className="label" htmlFor="max">{isFlowType ? 'Max conversations' : 'Max replies'}</label><input id="max" type="number" min="1" className="field" value={maxReplies} onChange={(e) => setMaxReplies(e.target.value)} /><p className="hint">Empty means unlimited</p></div>}
            </div>
            {!editing && (
              <label className="flex items-start gap-3 rounded-lg border border-line bg-canvas p-4 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ink" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>{isMod ? 'I understand matching comments will be removed automatically.' : 'I’ve checked the preview. Send these replies automatically.'}</span>
              </label>
            )}
            {error && <p role="alert" className="animate-fade-in rounded-lg bg-bad/5 px-3 py-2 text-sm font-medium text-bad">{error}</p>}
            {!ready && !editing && <p className="text-xs text-slate">To start: {[isComment && scope === 'POST' && !post && 'pick a post', !isMention && matchType !== 'ANY' && !keywords.length && !(isMod && modHideLinks) && (isMod ? 'add blocked words' : 'add a keyword'), type === 'COMMENT_DM' && !dmMessage.trim() && 'write the message', type === 'COMMENT_REPLY' && !commentReplies.length && 'add a reply', !confirmed && 'tick the confirmation'].filter(Boolean).join(', ')}.</p>}
            <div className="flex gap-2">
              <button type="button" disabled={!ready || busy} onClick={submit} className="btn-primary">{busy && <Spinner />}{editing ? 'Save changes' : isMod ? 'Start moderating' : 'Start automation'}</button>
              {editing && <button type="button" onClick={() => router.back()} className="btn-ghost">Cancel</button>}
            </div>
          </Step>
        </div>
      </div>

      <aside className="xl:sticky xl:top-8 xl:self-start">
        <p className="mb-3 text-sm font-semibold text-slate">Preview</p>
        <div className="overflow-hidden rounded-[28px] border-[6px] border-ink bg-white">
          <div className="flex items-center gap-2 border-b border-line p-3">
            {account.picture ? <img src={account.picture} alt="" className="h-7 w-7 rounded-full" /> : <span className="h-7 w-7 rounded-full bg-canvas" />}
            <span className="text-sm font-semibold">{account.username}</span>
            <PlatformIcon platform={account.platform} className="ml-auto h-4 w-4" />
          </div>
          {isComment && (
            <div className="border-b border-line p-4">
              <div className="aspect-[4/3] overflow-hidden rounded-md bg-canvas">
                {scope === 'ALL_POSTS' && <p className="flex h-full items-center justify-center p-6 text-center text-sm text-slate">Any of your posts</p>}
                {scope === 'POST' && post?.image && <img src={post.image} alt="" className="h-full w-full object-cover" />}
                {scope === 'POST' && !post?.image && <p className="flex h-full items-center justify-center p-4 text-center text-sm text-slate">{post?.caption?.slice(0, 100) || 'Pick a post'}</p>}
              </div>
              <p className="mt-3 text-sm"><strong>{isFb ? 'Priya Sharma' : 'priya.sharma'}</strong> {sample}</p>
              {commentReplies[0] && <p className="ml-6 mt-1 text-sm"><strong>{account.username}</strong> {isFb ? '' : '@priya.sharma '}{commentReplies[0]}</p>}
            </div>
          )}
          {isMod && (
            <div className="space-y-2 p-4 text-sm">
              <p className="rounded-lg bg-bad/5 px-3 py-2"><strong>spam_bot</strong> {keywords[0] || 'earn money fast at cheapdeals.in'}<span className="mt-1 block text-xs font-semibold text-bad">{modAction === 'DELETE' ? 'Deleted automatically' : 'Hidden automatically'}</span></p>
              <p className="px-3"><strong>priya.sharma</strong> Love this! 😍<span className="mt-1 block text-xs text-slate">Stays visible</span></p>
            </div>
          )}
          {!isMod && type !== 'COMMENT_REPLY' && (
            <div className="space-y-2 bg-canvas p-4">
              <p className="text-center text-[11px] text-slate">{isFb ? 'Messenger · Priya Sharma' : 'Chat with priya.sharma'}</p>
              {type === 'DM_FLOW' && <Bubble me>{sample}</Bubble>}
              {type === 'STORY_REPLY' && <><p className="text-right text-[11px] text-slate">Replied to your story</p><Bubble me>{matchType === 'ANY' ? '🔥🔥' : sample}</Bubble></>}
              {isMention && <div className="ml-auto w-[60%] rounded-xl border border-line bg-white p-3 text-center text-xs text-slate">Mentioned you in their story</div>}
              {type === 'COMMENT_DM' && (
                <>
                  <Bubble>{dmMessage || '…'}{!flowOn && linkUrl && <><br /><span className="underline">{trackClicks ? 'Tracked short link' : linkUrl}</span></>}</Bubble>
                  {flowOn && <Buttons items={[{ title: openerButton }]} />}
                </>
              )}
              {flowOn && followOn && (<><Bubble>{follow.followPrompt}</Bubble><Buttons items={[{ title: follow.followButton }]} /></>)}
              {flowOn && steps[0] && (
                <>
                  {steps[0].image && <div className="h-24 w-[70%] rounded-xl bg-line" aria-label="Image" />}
                  <Bubble>{steps[0].text || '…'}</Bubble>
                  <Buttons items={steps[0].buttons} />
                </>
              )}
            </div>
          )}
        </div>
        {flowOn && followOn && <p className="mt-2 text-xs text-slate">The follow message only appears to people who don't follow you yet.</p>}
      </aside>
    </div>
  );
}
