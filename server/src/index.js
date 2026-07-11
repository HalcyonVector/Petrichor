import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import weatherRouter from './routes/weather.js';
import presetsRouter from './routes/presets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 3001;
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/weather', weatherRouter);
app.use('/api/presets', presetsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// In production, serve the built client (npm run build) as static assets.
app.use(express.static(CLIENT_DIST));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(CLIENT_DIST, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`[server] ambient-generator API listening on http://localhost:${PORT}`);
});
