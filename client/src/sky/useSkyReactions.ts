import { useEffect, type RefObject } from 'react';
import type { EngineEvent, EngineListener } from '../audio/AudioEngine';

export type EngineSubscribe = (listener: EngineListener) => () => void;

interface SkyRefs {
  /** The sun/moon element; its `.sky-body-pulse` child glows on kicks. */
  body: RefObject<HTMLDivElement | null>;
  stars: RefObject<HTMLDivElement | null>;
  particles: RefObject<HTMLDivElement | null>;
  wash: RefObject<HTMLDivElement | null>;
}

const pick = <T,>(items: ArrayLike<T>): T | undefined =>
  items.length ? items[Math.floor(Math.random() * items.length)] : undefined;

/**
 * Lets the sky answer the music: the sun/moon glow pulses with each kick,
 * a star (or, by day, a drifting mote) flares on arp notes, and the light
 * washes warm on major chords and cool on minor ones. Uses the Web
 * Animations API directly on the DOM so none of this re-renders React.
 * Skipped entirely under prefers-reduced-motion.
 */
export function useSkyReactions(subscribe: EngineSubscribe | undefined, refs: SkyRefs) {
  useEffect(() => {
    if (!subscribe) return undefined;
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (media?.matches) return undefined;

    const handle = (event: EngineEvent) => {
      if (document.hidden) return;
      switch (event.type) {
        case 'kick': {
          const pulse = refs.body.current?.querySelector<HTMLElement>('.sky-body-pulse');
          pulse?.animate(
            [
              { opacity: 0.25 + event.velocity * 0.45, transform: 'scale(0.92)' },
              { opacity: 0, transform: 'scale(1.18)' },
            ],
            { duration: 520, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
          );
          break;
        }
        case 'note': {
          const starField = refs.stars.current;
          const night = starField ? Number(starField.style.opacity || 0) > 0.15 : false;
          if (night && starField) {
            pick(starField.children)?.animate(
              [
                { transform: 'scale(1)', opacity: 0.6, boxShadow: '0 0 0 0 rgba(255,255,255,0)' },
                { transform: 'scale(2.6)', opacity: 1, boxShadow: '0 0 6px 2px rgba(255,240,210,0.8)', offset: 0.18 },
                { transform: 'scale(1)', opacity: 0.6, boxShadow: '0 0 0 0 rgba(255,255,255,0)' },
              ],
              { duration: 1100, easing: 'ease-out' },
            );
          } else {
            pick(refs.particles.current?.children ?? [])?.animate(
              [{ filter: 'brightness(1)' }, { filter: 'brightness(3.2)', offset: 0.2 }, { filter: 'brightness(1)' }],
              { duration: 1000, easing: 'ease-out' },
            );
          }
          break;
        }
        case 'chord': {
          const wash = refs.wash.current;
          if (!wash) break;
          wash.dataset.tone = event.major ? 'warm' : 'cool';
          wash.animate([{ opacity: 0 }, { opacity: event.keyChanged ? 0.3 : 0.16, offset: 0.3 }, { opacity: 0 }], {
            duration: 4200,
            easing: 'ease-in-out',
          });
          break;
        }
      }
    };

    return subscribe(handle);
  }, [subscribe, refs.body, refs.stars, refs.particles, refs.wash]);
}
