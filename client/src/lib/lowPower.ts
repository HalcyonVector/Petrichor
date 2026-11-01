export type LowPowerSetting = 'auto' | 'on' | 'off';

interface DeviceHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/**
 * A lighter device, or one asking to save data: the browser's data saver
 * on, very weak hardware (2 cores or 2 GB or less), or modest hardware on
 * both counts (4 cores and 4 GB or less). A 4-core laptop with plenty of
 * memory keeps the full visuals. Unknown values don't count against the
 * device, so browsers that hide them aren't penalised.
 */
export function detectLowPowerDevice(hints: DeviceHints): boolean {
  if (hints.connection?.saveData) return true;
  const cores = typeof hints.hardwareConcurrency === 'number' && hints.hardwareConcurrency > 0 ? hints.hardwareConcurrency : undefined;
  const memory = typeof hints.deviceMemory === 'number' && hints.deviceMemory > 0 ? hints.deviceMemory : undefined;
  if ((cores !== undefined && cores <= 2) || (memory !== undefined && memory <= 2)) return true;
  return cores !== undefined && memory !== undefined && cores <= 4 && memory <= 4;
}

export function resolveLowPower(setting: LowPowerSetting, detected: boolean): boolean {
  return setting === 'on' || (setting === 'auto' && detected);
}
