import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Intentionally not wrapped in <React.StrictMode>: it double-invokes effects
// in dev, which tears down and rebuilds the Tone.js audio graph mid-session.
createRoot(document.getElementById('root')!).render(<App />);
