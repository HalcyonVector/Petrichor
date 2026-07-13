import { createApp } from './app.js';

const PORT = process.env.PORT ?? 5273;

createApp().listen(PORT, () => {
  console.log(`[server] ambient-generator API listening on http://localhost:${PORT}`);
});
