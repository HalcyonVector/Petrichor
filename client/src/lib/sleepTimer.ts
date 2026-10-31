/** Sleep timer lengths offered in the Studio, in minutes. */
export const SLEEP_TIMER_OPTIONS = [15, 30, 60, 90] as const;

/** How long the final fade-out lasts. The fade happens inside the timer, so a 30 minute timer is silent at 30:00. */
export const SLEEP_FADE_MS = 30_000;

/** Milliseconds left, never negative. */
export function sleepRemainingMs(endsAt: number, now: number): number {
  return Math.max(0, endsAt - now);
}

/** "M:SS" under an hour, "H:MM:SS" from an hour up. Rounds up, so the display never shows 0:00 while time remains. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
