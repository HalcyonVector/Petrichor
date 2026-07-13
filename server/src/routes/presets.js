import { Router } from 'express';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
// Overridable so tests can point at a throwaway file instead of the real store.
const DATA_FILE = process.env.PRESETS_DATA_FILE
  ? path.resolve(process.env.PRESETS_DATA_FILE)
  : path.join(DATA_DIR, 'presets.json');

async function readPresets() {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writePresets(presets) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(presets, null, 2), 'utf-8');
}

const router = Router();

// Presets store a *manual override* snapshot of AmbientParams so a user can
// recall a sound they liked instead of always following live inputs.
router.get('/', async (_req, res) => {
  res.json(await readPresets());
});

router.post('/', async (req, res) => {
  const { name, params } = req.body ?? {};
  if (!name || typeof name !== 'string' || !params || typeof params !== 'object') {
    return res.status(400).json({ error: 'invalid_body', message: 'Expected { name: string, params: object }' });
  }

  const presets = await readPresets();
  const existingIndex = presets.findIndex((p) => p.name === name);
  const entry = { name, params, savedAt: new Date().toISOString() };
  if (existingIndex >= 0) presets[existingIndex] = entry;
  else presets.push(entry);

  await writePresets(presets);
  res.status(201).json(entry);
});

router.delete('/:name', async (req, res) => {
  const presets = await readPresets();
  const next = presets.filter((p) => p.name !== req.params.name);
  if (next.length === presets.length) {
    return res.status(404).json({ error: 'not_found' });
  }
  await writePresets(next);
  res.status(204).end();
});

export default router;
