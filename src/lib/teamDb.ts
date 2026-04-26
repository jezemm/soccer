import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, getDoc, collection } from 'firebase/firestore';

export const EMJSC_FALLBACK_CODE = 'emjsc2026';

export interface TeamCtxValue {
  clubId: string;
  teamId: string;
  // Empty string = pre-migration flat paths (legacy). Non-empty = nested multi-tenant path.
  teamPath: string;
  teamName: string;
  teamShortName: string;
  teamLogoUrl: string;
  homeGround: string;
  accessCode: string;
  loading: boolean;
  error: string | null;
}

// Pre-migration defaults — teamPath is empty so all Firestore helpers use flat paths
const EMJSC_DEFAULTS: Omit<TeamCtxValue, 'loading' | 'error'> = {
  clubId: 'emjsc',
  teamId: 'u8-saturday-white',
  teamPath: '',
  teamName: 'EMJSC U8 Saturday White',
  teamShortName: 'EMJSC',
  teamLogoUrl: '',
  homeGround: 'Central Park, Malvern VIC',
  accessCode: EMJSC_FALLBACK_CODE,
};

const DEFAULT_CTX: TeamCtxValue = { ...EMJSC_DEFAULTS, loading: true, error: null };

const TeamContext = createContext<TeamCtxValue>(DEFAULT_CTX);

// Resolve access code → {clubId, teamId}, then load team doc for branding
async function resolveTeamContext(code: string): Promise<TeamCtxValue> {
  const codeSnap = await getDoc(doc(db, 'accessCodes', code));
  if (!codeSnap.exists()) {
    return { ...EMJSC_DEFAULTS, teamPath: '', loading: false, error: `Unknown team code: ${code}` };
  }
  const { clubId, teamId } = codeSnap.data() as { clubId: string; teamId: string };
  const teamPath = `clubs/${clubId}/teams/${teamId}`;
  const teamSnap = await getDoc(doc(db, teamPath));
  const d = teamSnap.exists() ? teamSnap.data() : {};
  return {
    clubId,
    teamId,
    teamPath,
    teamName: d.name || EMJSC_DEFAULTS.teamName,
    teamShortName: d.shortName || clubId.toUpperCase(),
    teamLogoUrl: d.teamLogoUrl || '',
    homeGround: d.homeGround || EMJSC_DEFAULTS.homeGround,
    accessCode: code,
    loading: false,
    error: null,
  };
}

export function TeamContextProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<TeamCtxValue>(DEFAULT_CTX);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('t');
    if (urlCode) localStorage.setItem('teamhub_code', urlCode);
    const code = urlCode || localStorage.getItem('teamhub_code') || EMJSC_FALLBACK_CODE;

    if (code === EMJSC_FALLBACK_CODE) {
      // Check if migration has run (accessCodes doc exists)
      getDoc(doc(db, 'accessCodes', code)).then(snap => {
        if (snap.exists()) {
          resolveTeamContext(code).then(setCtx).catch(() =>
            setCtx({ ...EMJSC_DEFAULTS, loading: false, error: null })
          );
        } else {
          // Pre-migration: use flat Firestore paths (empty teamPath = legacy mode)
          setCtx({ ...EMJSC_DEFAULTS, loading: false, error: null });
        }
      }).catch(() => setCtx({ ...EMJSC_DEFAULTS, loading: false, error: null }));
    } else {
      resolveTeamContext(code)
        .then(setCtx)
        .catch(() => setCtx({ ...EMJSC_DEFAULTS, teamPath: '', loading: false, error: 'Failed to load team.' }));
    }
  }, []);

  return React.createElement(TeamContext.Provider, { value: ctx }, children);
}

export function useTeamContext() {
  return useContext(TeamContext);
}

// Returns helpers for building Firestore paths scoped to the current team.
// teamPath === '' means pre-migration flat collections (legacy EMJSC mode).
// Always include teamPath in useEffect dependency arrays so effects re-subscribe on team change.
export function useTeamDb() {
  const ctx = useContext(TeamContext);
  const { teamPath } = ctx;
  // Prefix includes trailing slash, e.g. 'clubs/emjsc/teams/u8-saturday-white/'
  // Empty string means use flat collection names directly.
  const prefix = teamPath ? `${teamPath}/` : '';

  return {
    teamPath,
    ctx,
    teamCollection: (name: string) => collection(db, `${prefix}${name}`),
    teamDoc: (collectionName: string, docId: string) =>
      doc(db, `${prefix}${collectionName}/${docId}`),
    settingsDoc: (name: string) => doc(db, `${prefix}settings/${name}`),
    globalCollection: (name: string) => collection(db, `global/${name}`),
    globalDoc: (collectionName: string, docId: string) =>
      doc(db, `global/${collectionName}/${docId}`),
  };
}
