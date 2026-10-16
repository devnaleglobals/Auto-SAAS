'use client';
import { useEffect, useRef, useState } from 'react';

// Counts up to a number once when it first appears. Respects reduced motion.
export default function CountUp({ value, format = 'number', duration = 700 }) {
  const [shown, setShown] = useState(value);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) { setShown(value); return; }
    started.current = true;
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !value) { setShown(value); return; }
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0); raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const text = format === 'rupees' ? `₹${shown.toLocaleString('en-IN')}` : format === 'percent' ? `${shown}%` : shown.toLocaleString('en-IN');
  return <span className="tabular-nums">{text}</span>;
}
