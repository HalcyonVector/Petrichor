import { useMemo, useRef, type CSSProperties } from 'react';
import { useSkyReactions, type EngineSubscribe } from '../sky/useSkyReactions';
import { nightness } from '../mapping/parameterMapping';
import { rainIntensity } from '../lib/weatherIntensity';
import { isSnowing } from '../lib/weatherCode';
import {
  celestialPosition,
  horizonGlowIntensity,
  horizonSilhouetteColor,
  pickCelestialBody,
  skyGradientStops,
  starFieldOpacity,
} from '../sky/skyMath';
import type { WeatherSnapshot } from '../types';

interface SkyProps {
  hour: number;
  weather: WeatherSnapshot | null;
  /** Increments on each lightning strike; 0 means "none yet". See useLightning. */
  lightningTrigger?: number;
  /** Engine event subscription, so the sky can react to kicks, notes and chords. */
  subscribe?: EngineSubscribe;
}

const STAR_COUNT = 70;
const CLOUD_COUNT = 5;
const PARTICLE_COUNT = 18;
const HORIZON_POINTS = 14;

interface Star {
  left: number;
  top: number;
  size: number;
  twinkleDelay: number;
}

interface Cloud {
  left: number;
  top: number;
  width: number;
  driftDuration: number;
  driftDelay: number;
  baseOpacity: number;
}

interface Particle {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

function seededStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 58,
    size: 1 + Math.random() * 1.6,
    twinkleDelay: Math.random() * 6,
  }));
}

function seededClouds(): Cloud[] {
  return Array.from({ length: CLOUD_COUNT }, (_, i) => ({
    left: (i / CLOUD_COUNT) * 90 + Math.random() * 10,
    top: 6 + Math.random() * 26,
    width: 26 + Math.random() * 22,
    driftDuration: 50 + Math.random() * 40,
    driftDelay: -Math.random() * 60,
    baseOpacity: 0.35 + Math.random() * 0.3,
  }));
}

function seededParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    left: Math.random() * 100,
    size: 1.5 + Math.random() * 2.5,
    duration: 16 + Math.random() * 20,
    delay: -Math.random() * 30,
    drift: (Math.random() - 0.5) * 40,
  }));
}

/** A gentle rolling-hills silhouette — a smoothed random walk so peaks don't jump wildly between neighbors. */
function seededHorizonHeights(): number[] {
  const heights: number[] = [];
  let h = 28 + Math.random() * 18;
  for (let i = 0; i < HORIZON_POINTS; i++) {
    h += (Math.random() - 0.5) * 22;
    h = Math.max(8, Math.min(78, h));
    heights.push(h);
  }
  return heights;
}

function horizonPolygonPoints(heights: number[]): string {
  const step = 100 / (heights.length - 1);
  const ridge = heights.map((h, i) => `${(i * step).toFixed(2)},${(100 - h).toFixed(2)}`);
  return ['0,100', ...ridge, '100,100'].join(' ');
}

/**
 * Fixed full-viewport background: the sky isn't decoration here, it's a
 * direct read-out of the real hour and weather feeding the audio engine —
 * sun/moon position, star density, and rain all move because the inputs
 * moved, the same way the sound does.
 */
export function SkyScene({ hour, weather, lightningTrigger = 0, subscribe }: SkyProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const washRef = useRef<HTMLDivElement>(null);
  useSkyReactions(subscribe, { body: bodyRef, stars: starsRef, particles: particlesRef, wash: washRef });

  const stars = useMemo(seededStars, []);
  const clouds = useMemo(seededClouds, []);
  const particles = useMemo(seededParticles, []);
  const horizonHeights = useMemo(seededHorizonHeights, []);

  const night = nightness(hour);
  const cloudCoverPct = weather?.cloudCoverPct ?? 40;
  const precipitationMm = weather?.precipitationMm ?? 0;

  const body = pickCelestialBody(hour, weather?.isDay);
  const pos = celestialPosition(hour, body);
  const gradient = skyGradientStops(night, cloudCoverPct);
  const starOpacity = starFieldOpacity(night, cloudCoverPct);
  const rain = rainIntensity(precipitationMm);
  const horizonColor = horizonSilhouetteColor(night);
  const duskGlow = horizonGlowIntensity(body, pos.arc);

  const snowing = isSnowing(weather?.weatherCode);
  const precipCount = precipitationMm > 0.05 ? Math.round((8 + rain * 34) / 5) * 5 : 0;
  const dropCount = snowing ? 0 : precipCount;
  const flakeCount = snowing ? precipCount : 0;

  const drops = useMemo(
    () =>
      Array.from({ length: dropCount }, () => ({
        left: Math.random() * 100,
        duration: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 1.6,
        height: 14 + Math.random() * 14,
      })),
    [dropCount],
  );

  const flakes = useMemo(
    () =>
      Array.from({ length: flakeCount }, () => ({
        left: Math.random() * 100,
        duration: 7 + Math.random() * 7,
        delay: -Math.random() * 12,
        size: 3 + Math.random() * 3,
      })),
    [flakeCount],
  );

  return (
    <div
      className="sky-scene"
      style={{ background: `linear-gradient(180deg, ${gradient.top} 0%, ${gradient.bottom} 100%)` }}
      aria-hidden="true"
    >
      <div ref={starsRef} className="sky-stars" style={{ opacity: starOpacity }}>
        {stars.map((s, i) => (
          <span
            key={i}
            className="sky-star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.twinkleDelay}s`,
            }}
          />
        ))}
      </div>

      {clouds.map((c, i) => (
        <div
          key={i}
          className="sky-cloud"
          style={{
            left: `${c.left}%`,
            top: `${c.top}%`,
            width: `${c.width}vw`,
            opacity: (cloudCoverPct / 100) * c.baseOpacity,
            animationDuration: `${c.driftDuration}s`,
            animationDelay: `${c.driftDelay}s`,
          }}
        />
      ))}

      <div
        ref={bodyRef}
        className={`sky-body sky-body--${body}`}
        style={{
          left: `${pos.xPct}%`,
          top: `${pos.yPct}%`,
          opacity: 0.5 + pos.glow * 0.5,
          boxShadow: `0 0 ${20 + pos.glow * 50}px ${6 + pos.glow * 14}px ${
            body === 'sun' ? 'rgba(255, 220, 150, 0.35)' : 'rgba(233, 217, 172, 0.28)'
          }`,
        }}
      >
        <span className="sky-body-pulse" />
      </div>

      <div ref={washRef} className="sky-chord-wash" data-tone="warm" />

      {dropCount > 0 && (
        <div className="sky-rain">
          {drops.map((d, i) => (
            <span
              key={i}
              className="sky-raindrop"
              style={{
                left: `${d.left}%`,
                height: d.height,
                animationDuration: `${d.duration}s`,
                animationDelay: `${d.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {flakeCount > 0 && (
        <div className="sky-snow">
          {flakes.map((f, i) => (
            <span
              key={i}
              className="sky-snowflake"
              style={{
                left: `${f.left}%`,
                width: f.size,
                height: f.size,
                animationDuration: `${f.duration}s`,
                animationDelay: `${f.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {lightningTrigger > 0 && <div key={lightningTrigger} className="sky-lightning" />}

      {duskGlow > 0.03 && (
        <div
          className="sky-horizon-glow"
          style={{ left: `${pos.xPct}%`, opacity: duskGlow * 0.85 }}
        />
      )}

      <svg
        className="sky-horizon"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ fill: horizonColor }}
      >
        <polygon points={horizonPolygonPoints(horizonHeights)} />
      </svg>

      <div className="sky-horizon-fade" />

      <div ref={particlesRef} className="sky-particles">
        {particles.map((p, i) => (
          <span
            key={i}
            className="sky-particle"
            style={
              {
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                '--drift': `${p.drift}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
