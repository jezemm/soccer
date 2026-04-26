import React, {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import { HashRouter, useLocation } from 'react-router-dom';
import App from './App.tsx';
import { TeamContextProvider } from './lib/teamDb.ts';
import './index.css';

const SuperAdminApp = React.lazy(() =>
  import('./superadmin/SuperAdminApp.tsx').then(m => ({ default: m.SuperAdminApp }))
);

function RootRouter() {
  const { pathname } = useLocation();

  if (pathname.startsWith('/superadmin')) {
    return (
      <Suspense fallback={null}>
        <SuperAdminApp />
      </Suspense>
    );
  }

  return (
    <TeamContextProvider>
      <App />
    </TeamContextProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <RootRouter />
    </HashRouter>
  </StrictMode>
);
