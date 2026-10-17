'use client';
import { useState } from 'react';

// One orchestrated sequence: comment -> public reply -> private message -> tap -> link.
const at = (s) => ({ animationDelay: `${s}s` });

export default function ChatDemo({ dark = false }) {
  const [run, setRun] = useState(0);
  return (
    <div className="relative mx-auto w-full max-w-[360px]" key={run}>
      <div className={`overflow-hidden rounded-[28px] border-[6px] bg-white ${dark ? 'border-white/15 shadow-[0_30px_80px_-30px_rgba(0,0,0,.6)]' : 'border-ink shadow-pop'}`}>
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-marigold" aria-hidden>RS</span>
          <span className="text-sm font-semibold text-ink">rangoli.sarees</span>
        </div>
        {/* The post: type as the image, in brand colours only */}
        <div className="relative flex aspect-[5/3] flex-col justify-end bg-ink p-5" aria-hidden>
          <p className="font-display text-[26px] font-extrabold leading-[1.02] text-white">Festive<br />drop is live</p>
          <p className="mt-2 text-xs font-semibold text-marigold">Comment “link” for the catalogue</p>
        </div>
        <div className="space-y-2 px-4 py-3 text-sm text-ink">
          <p className="demo-step" style={at(0.4)}><strong>meera_k</strong> link please 😍</p>
          <p className="demo-step ml-5 text-slate" style={at(1.3)}><strong className="text-ink">rangoli.sarees</strong> Sent it to your DMs 📩</p>
        </div>
        <div className="space-y-2 border-t border-line bg-canvas px-4 py-4">
          <p className="demo-step text-center text-[11px] text-slate" style={at(2.1)}>Private message to meera_k</p>
          <div className="demo-step max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-ink" style={at(2.3)}>Hi Meera! Tap below and I’ll send you the catalogue 🙌</div>
          <div className="demo-step w-[85%]" style={at(2.7)}>
            <div className="demo-tap rounded-xl border border-line bg-white py-1.5 text-center text-sm font-semibold text-sky" style={at(3.6)}>Send it to me</div>
          </div>
          <div className="demo-step ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-sm text-white" style={at(4.1)}>Send it to me</div>
          <div className="demo-step max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-ink" style={at(4.8)}>Here’s the festive catalogue 👇</div>
          <div className="demo-step w-[85%] rounded-xl border border-line bg-white py-1.5 text-center text-sm font-semibold text-sky" style={at(5.1)}>Open catalogue</div>
        </div>
      </div>
      <button type="button" onClick={() => setRun((r) => r + 1)} className={`mx-auto mt-4 block rounded-md px-2 py-1 text-xs font-semibold ${dark ? 'text-white/60 hover:text-white' : 'text-slate hover:text-ink'}`}>
        Replay
      </button>
    </div>
  );
}
