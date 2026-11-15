import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

try {
  registerSW({
    immediate: true,
    onOfflineReady() {
      // App shell cached for offline resilience
    }
  });
} catch (_) {
  // Service worker registration optional if browser disallows it
}

createRoot(document.getElementById('root')!).render(<App />);
