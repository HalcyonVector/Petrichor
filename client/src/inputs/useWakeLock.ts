import { useEffect, useRef } from 'react';

/**
 * Requests a screen wake lock while `active` is true so the device doesn't
 * sleep mid-session, and re-acquires it if the tab regains visibility
 * (the OS releases wake locks when a tab is backgrounded). Silently no-ops
 * on browsers without the API — it's a nice-to-have, not required.
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;
    let cancelled = false;

    const acquire = () => {
      navigator.wakeLock
        .request('screen')
        .then((lock) => {
          if (cancelled) {
            lock.release().catch(() => {});
            return;
          }
          lockRef.current = lock;
        })
        .catch(() => {
          // Refusal (low battery, backgrounded tab, unsupported context) is non-fatal.
        });
    };

    acquire();

    const reacquireOnVisible = () => {
      if (document.visibilityState === 'visible' && !lockRef.current) acquire();
    };
    document.addEventListener('visibilitychange', reacquireOnVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', reacquireOnVisible);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}
