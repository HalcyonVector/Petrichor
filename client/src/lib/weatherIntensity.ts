/**
 * Normalizes precipitation (mm/h) into a 0..1 intensity. Shared by the
 * synthesis mapping (rain noise layer level) and the sky visual (raindrop
 * count) so "how much rain" means the same thing in both places instead of
 * two independent magic numbers drifting apart.
 */
export function rainIntensity(precipitationMm: number): number {
  return Math.max(0, Math.min(1, precipitationMm / 4));
}
