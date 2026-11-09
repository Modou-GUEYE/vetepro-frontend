import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './app/App';
import { config } from './core/config';

async function bootstrap() {
  if (config.useMocks) {
    try {
      const { worker } = await import('./mocks/browser');
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('démarrage trop long')), 5000));
      await Promise.race([worker.start({ onUnhandledRequest: 'bypass' }), timeout]);
    } catch (e) {
      console.warn('MSW indisponible, appels API réels', e);
    }
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><App /></React.StrictMode>,
  );
}

void bootstrap();
