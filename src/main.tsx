import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.tsx';
import { TeamContextProvider } from './lib/teamDb.ts';
import './index.css';

// Superadmin portal is a fully separate UI — detect by hash prefix at page load.
const isSuperAdmin = window.location.hash.startsWith('#/superadmin');

async function bootstrap() {
  const root = createRoot(document.getElementById('root')!);

  if (isSuperAdmin) {
    const { SuperAdminApp } = await import('./superadmin/SuperAdminApp.tsx');
    root.render(
      <StrictMode>
        <HashRouter>
          <SuperAdminApp />
        </HashRouter>
      </StrictMode>
    );
  } else {
    root.render(
      <StrictMode>
        <HashRouter>
          <TeamContextProvider>
            <App />
          </TeamContextProvider>
        </HashRouter>
      </StrictMode>
    );
  }
}

bootstrap();
