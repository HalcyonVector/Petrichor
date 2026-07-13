import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Intentionally not wrapped in <React.StrictMode>: it double-invokes effects
// in dev, which tears down and rebuilds the Tone.js audio graph mid-session.
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

// Only register in production builds — in dev this would cache Vite's
// module graph and fight with HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline shell caching is a nice-to-have; failure here shouldn't be user-visible.
    });
  });
}
