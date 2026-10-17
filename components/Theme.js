'use client';
import { useEffect, useState } from 'react';

const KEY = 'rr_theme';
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');
export function applyTheme(t) {
  const dark = t === 'dark' || (t === 'system' && mq().matches);
  document.documentElement.classList.toggle('dark', dark);
}
function useTheme() {
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    setTheme(localStorage.getItem(KEY) || 'light');
    const onSys = () => { if ((localStorage.getItem(KEY) || 'light') === 'system') applyTheme('system'); };
    const m = mq(); m.addEventListener('change', onSys);
    const onOther = () => setTheme(localStorage.getItem(KEY) || 'light');
    window.addEventListener('rr-theme', onOther);
    return () => { m.removeEventListener('change', onSys); window.removeEventListener('rr-theme', onOther); };
  }, []);
  const choose = (t) => { localStorage.setItem(KEY, t); applyTheme(t); setTheme(t); window.dispatchEvent(new Event('rr-theme')); };
  return [theme, choose];
}

function Preview({ dark }) {
  const c = dark
    ? { page: '#0E121E', side: '#090D17', card: '#161C2C', line: '#2A3348', text: '#E8ECF5' }
    : { page: '#F5F6FA', side: '#141B2E', card: '#FFFFFF', line: '#DEE2EC', text: '#172036' };
  return (
    <svg viewBox="0 0 120 72" className="h-auto w-full rounded-lg" aria-hidden>
      <rect width="120" height="72" fill={c.page} />
      <rect width="30" height="72" fill={c.side} />
      <rect x="6" y="10" width="16" height="3" rx="1.5" fill="#F2A900" />
      {[20, 27, 34].map((y) => <rect key={y} x="6" y={y} width="18" height="3" rx="1.5" fill="#FFFFFF" opacity=".35" />)}
      <rect x="38" y="10" width="40" height="5" rx="2" fill={c.text} />
      <rect x="38" y="22" width="74" height="40" rx="5" fill={c.card} stroke={c.line} />
      <rect x="44" y="30" width="30" height="3" rx="1.5" fill={c.text} opacity=".7" />
      <rect x="44" y="38" width="50" height="3" rx="1.5" fill={c.text} opacity=".35" />
      <rect x="44" y="49" width="20" height="7" rx="2" fill="#F2A900" />
    </svg>
  );
}

// Settings → Appearance
export function ThemePicker() {
  const [theme, choose] = useTheme();
  const options = [['light', 'Light', false], ['dark', 'Dark', true], ['system', 'Match my device', null]];
  return (
    <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
      {options.map(([v, label, dark]) => (
        <button key={v} type="button" role="radio" aria-checked={theme === v} onClick={() => choose(v)}
          className={`rounded-xl border p-3 text-left transition-colors ${theme === v ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-slate/60'}`}>
          {dark === null ? (
            <div className="grid grid-cols-2 overflow-hidden rounded-lg"><Preview dark={false} /><Preview dark /></div>
          ) : <Preview dark={dark} />}
          <span className="mt-2.5 flex items-center justify-between text-sm font-semibold">{label}
            <span className={`h-4 w-4 rounded-full border-2 ${theme === v ? 'border-ink bg-ink shadow-[inset_0_0_0_2px_rgb(var(--surface))]' : 'border-line'}`} aria-hidden />
          </span>
        </button>
      ))}
    </div>
  );
}

// Sidebar quick switch between light and dark
export function ThemeToggle() {
  const [theme, choose] = useTheme();
  const [isDark, setIsDark] = useState(false);
  useEffect(() => { setIsDark(document.documentElement.classList.contains('dark')); }, [theme]);
  return (
    <button type="button" onClick={() => choose(isDark ? 'light' : 'dark')} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} title={isDark ? 'Light theme' : 'Dark theme'}
      className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
      {isDark ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  );
}
