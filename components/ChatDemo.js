'use client';
import { useState } from 'react';

// One orchestrated sequence: comment -> public reply -> private message -> tap -> link.
const at = (s) => ({ animationDelay: `${s}s` });

export default function ChatDemo({ dark = false }) {
  const [run, setRun] = useState(0);
  return (
    <div className="relative mx-auto w-full max-w-[380px]" key={run}>
      <div className={`overflow-hidden rounded-[30px] border-[7px] ${dark ? 'border-white/10 bg-white' : 'border-ink bg-white shadow-pop'}`}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="h-7 w-7 rounded-full bg-gradient-to-br from-marigold to-[#E2541B]" aria-hidden />
          <span className="text-sm font-semibold text-ink">rangoli.sarees</span>
        </div>
        <div className="relative aspect-[5/3] bg-[#FCE9C8]" aria-hidden>
          <div className="absolute inset-x-6 bottom-0 top-6 rounded-t-[999px] bg-[#E2541B]/85" />
          <div className="absolute inset-x-14 bottom-0 top-14 rounded-t-[999px] bg-marigold" />
          <p className="absolute bottom-3 left-4 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-ink">Festive drop is live</p>
        </div>
        <div className="space-y-2 px-4 py-3 text-sm text-ink">
          <p className="demo-step" style={at(0.4)}><strong>meera_k</strong> link please 😍</p>
          <p className="demo-step ml-5" style={at(1.3)}><strong>rangoli.sarees</strong> Sent it to your DMs 📩</p>
        </div>
        <div className="space-y-2 border-t border-line bg-canvas px-4 py-4">
          <p className="demo-step text-center text-[11px] text-slate" style={at(2.1)}>Private message to meera_k</p>
          <div className="demo-step max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-ink" style={at(2.3)}>Hi Meera! Tap below and I’ll send you the collection 🙌</div>
          <div className="demo-step w-[85%]" style={at(2.7)}>
            <div className="demo-tap rounded-xl border border-line bg-white py-1.5 text-center text-sm font-semibold text-sky" style={at(3.6)}>Send it to me</div>
          </div>
          <div className="demo-step ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-sm text-white" style={at(4.1)}>Send it to me</div>
          <div className="demo-step max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-ink" style={at(4.8)}>Here’s the festive collection 👇</div>
          <div className="demo-step w-[85%] rounded-xl border border-line bg-white py-1.5 text-center text-sm font-semibold text-sky" style={at(5.1)}>Shop now ↗</div>
        </div>
      </div>
      <button type="button" onClick={() => setRun((r) => r + 1)} className={`mx-auto mt-4 block text-xs font-semibold ${dark ? 'text-white/70 hover:text-white' : 'text-slate hover:text-ink'}`}>
        Replay
      </button>
    </div>
  );
}
