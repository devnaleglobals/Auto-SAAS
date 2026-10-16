'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Refreshes server data every few seconds while the tab is visible (live activity).
export default function AutoRefresh({ seconds = 30 }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
