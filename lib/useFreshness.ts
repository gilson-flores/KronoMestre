'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || '';
const MIN_GAP_MS = 20_000;
const POLL_MS = 120_000;

export function useFreshness(opts: { enabled: boolean; onChanged: (changed: string[]) => void }) {
  const { enabled, onChanged } = opts;
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const lastRevRef = useRef<Record<string, number> | null>(null);
  const lastCheckRef = useRef(0);
  const onChangedRef = useRef(onChanged);
  useEffect(() => { onChangedRef.current = onChanged; }, [onChanged]);

  const check = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastCheckRef.current < MIN_GAP_MS) return;
    lastCheckRef.current = now;

    try {
      const res = await fetch('/api/sync-state', { cache: 'no-store' });
      if (!res.ok) return;
      const state = await res.json();

      if (CLIENT_BUILD_ID && state.build && state.build !== 'dev' && state.build !== CLIENT_BUILD_ID) {
        setUpdateAvailable(true);
      }

      const rev: Record<string, number> = state.rev || {};
      const prev = lastRevRef.current;
      lastRevRef.current = rev;
      if (!prev) return;

      const changed = Object.keys(rev).filter((k) => prev[k] !== undefined && prev[k] !== rev[k]);
      if (changed.length > 0) onChangedRef.current(changed);
    } catch {}
  }, []);

  useEffect(() => {
    if (!enabled) {
      lastRevRef.current = null;
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
      void check(true);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    const onOnline = () => void check(true);

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onOnline);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void check();
    }, POLL_MS + Math.random() * 30_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onOnline);
      clearInterval(timer);
    };
  }, [enabled, check]);

  return { updateAvailable, checkNow: () => check(true) };
}
