import type { AmbientParams } from '../types';

/**
 * Focus mode: the same live sound, with the attention-grabbing parts held
 * down. The arp stops reacting to typing (it would otherwise answer every
 * keystroke), the hi-hat and drums thin out to a soft pulse, and the top end
 * is rounded off. Key, mode, weather textures and tempo still follow the
 * live inputs. The engine separately keeps the harmony to calm I/IV/vi
 * movement and skips thunder.
 */
export function applyFocusMode(params: AmbientParams): AmbientParams {
  return {
    ...params,
    arpDensity: 0.08,
    hihatDensity: Math.min(params.hihatDensity, 0.06),
    drumDensity: Math.min(params.drumDensity ?? 0.3, 0.12),
    brightness: params.brightness * 0.8,
  };
}
