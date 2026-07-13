import type { AmbientParams, Preset } from '../types';

const LOCAL_KEY = 'ambient-weather-engine:presets';

export type PresetSource = 'server' | 'local';

function readLocal(): Preset[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Preset[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(presets: Preset[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(presets));
  } catch {
    // Quota exceeded or storage disabled — presets are a nice-to-have, not critical state.
  }
}

/**
 * Presets normally live on the backend, but this is meant to work as a
 * client-only tool too: any network failure (backend down, offline, no
 * server at all) transparently falls back to localStorage instead of
 * losing the save. Callers get told which source served the request so the
 * UI can be honest about it.
 */
export async function listPresets(): Promise<{ presets: Preset[]; source: PresetSource }> {
  try {
    const res = await fetch('/api/presets');
    if (!res.ok) throw new Error(`presets API ${res.status}`);
    return { presets: (await res.json()) as Preset[], source: 'server' };
  } catch {
    return { presets: readLocal(), source: 'local' };
  }
}

export async function savePreset(name: string, params: AmbientParams): Promise<{ preset: Preset; source: PresetSource }> {
  try {
    const res = await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, params }),
    });
    if (!res.ok) throw new Error(`presets API ${res.status}`);
    return { preset: (await res.json()) as Preset, source: 'server' };
  } catch {
    const presets = readLocal().filter((p) => p.name !== name);
    const entry: Preset = { name, params, savedAt: new Date().toISOString() };
    presets.push(entry);
    writeLocal(presets);
    return { preset: entry, source: 'local' };
  }
}

export async function deletePreset(name: string): Promise<{ source: PresetSource }> {
  try {
    const res = await fetch(`/api/presets/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`presets API ${res.status}`);
    return { source: 'server' };
  } catch {
    writeLocal(readLocal().filter((p) => p.name !== name));
    return { source: 'local' };
  }
}
