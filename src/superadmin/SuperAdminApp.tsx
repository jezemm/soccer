import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { SuperAdminLogin } from './SuperAdminLogin';
import { SuperAdminNav, SuperAdminTab } from './SuperAdminNav';
import { SuperAdminClubs } from './SuperAdminClubs';
import { SuperAdminFixtures } from './SuperAdminFixtures';
import { SuperAdminFaq } from './SuperAdminFaq';
import { SuperAdminFeatures } from './SuperAdminFeatures';
import { SuperAdminSettings } from './SuperAdminSettings';
import type { FeatureRequest } from '../lib/firebase';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function isAuthenticated() {
  const ts = localStorage.getItem('superadmin_auth_ts');
  if (!ts) return false;
  return Date.now() - Number(ts) < SESSION_TTL_MS;
}

export function SuperAdminApp() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [tab, setTab] = useState<SuperAdminTab>('clubs');
  const [newFeatureCount, setNewFeatureCount] = useState(0);

  // Watch all feature requests for badge count (collectionGroup)
  useEffect(() => {
    if (!authed) return;
    // Simple count from legacy flat collection + teams subcollections.
    // Using a separate lightweight listener just for new counts.
    let unsubs: Array<() => void> = [];

    // Count "new" status across all collections this admin can see.
    // For simplicity, track the flat + known team paths.
    const trackCount = (col: any) => {
      const unsub = onSnapshot(col, (snap: any) => {
        const n = snap.docs.filter((d: any) => d.data().status === 'new').length;
        setNewFeatureCount(prev => Math.max(0, prev) + n);
      });
      unsubs.push(unsub);
    };

    setNewFeatureCount(0);
    // Track legacy flat collection
    trackCount(collection(db, 'featureRequests'));
    return () => unsubs.forEach(u => u());
  }, [authed]);

  if (!authed) {
    return <SuperAdminLogin onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SuperAdminNav activeTab={tab} onTabChange={setTab} featureCount={newFeatureCount} />

      {/* Content area with sidebar offset on desktop */}
      <main className="md:ml-56 pb-20 md:pb-6 min-h-screen">
        {/* Header bar */}
        <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-5 py-3 flex items-center gap-3">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-violet-500 bg-violet-950 px-2.5 py-1 rounded-lg">
            SUPER ADMIN
          </span>
          <span className="text-xs font-bold text-slate-500 hidden sm:block">
            Soccer Hub Management Portal
          </span>
          <button
            onClick={() => {
              localStorage.removeItem('superadmin_auth_ts');
              setAuthed(false);
            }}
            className="ml-auto text-[10px] font-black uppercase text-slate-600 hover:text-red-400 tracking-wide transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5 md:p-8 max-w-3xl">
          {tab === 'clubs' && <SuperAdminClubs />}
          {tab === 'fixtures' && <SuperAdminFixtures />}
          {tab === 'faq' && <SuperAdminFaq />}
          {tab === 'features' && <SuperAdminFeatures />}
          {tab === 'settings' && <SuperAdminSettings />}
        </div>
      </main>
    </div>
  );
}
