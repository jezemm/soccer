import React, { useState, useEffect } from 'react';
import { db, FUNCTIONS_BASE } from '../lib/firebase';
import {
  collection, doc, onSnapshot, getDocs, setDoc, writeBatch
} from 'firebase/firestore';
import { Calendar, RefreshCw, Check, ChevronDown } from 'lucide-react';

interface Club { id: string; name: string; shortName: string; }
interface Team { id: string; name: string; driblTeamName: string; homeGround: string; }

interface DriblFixture {
  round?: string;
  date?: string;
  time?: string;
  home_team_name?: string;
  away_team_name?: string;
  home_team_logo?: string;
  away_team_logo?: string;
  venue?: string;
  field_name?: string;
  map_url?: string;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function SuperAdminFixtures() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedClub, setSelectedClub] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamObj, setTeamObj] = useState<Team | null>(null);

  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'scraping' | 'done' | 'error'>('idle');
  const [fixtures, setFixtures] = useState<DriblFixture[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [driblTeamFilter, setDriblTeamFilter] = useState('');
  const [emjscTeams, setEmjscTeams] = useState<string[]>([]);

  // Load clubs
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clubs'), snap => {
      setClubs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Club)));
    });
    return () => unsub();
  }, []);

  // Load teams for selected club
  useEffect(() => {
    if (!selectedClub) { setTeams([]); return; }
    const unsub = onSnapshot(collection(db, `clubs/${selectedClub}/teams`), snap => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    });
    return () => unsub();
  }, [selectedClub]);

  // Update teamObj when selection changes
  useEffect(() => {
    const t = teams.find(t => t.id === selectedTeam) || null;
    setTeamObj(t);
    if (t?.driblTeamName) setDriblTeamFilter(t.driblTeamName);
  }, [selectedTeam, teams]);

  const scrape = async () => {
    setScrapeStatus('scraping');
    setFixtures([]);
    setPreview([]);
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/scrapeDribl`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw: DriblFixture[] = Array.isArray(data.fixtures) ? data.fixtures
        : Array.isArray(data) ? data : [];
      setFixtures(raw);
      // Detect team names in scraped data
      const names = new Set<string>();
      raw.forEach(f => {
        if (f.home_team_name) names.add(f.home_team_name);
        if (f.away_team_name) names.add(f.away_team_name);
      });
      const ours = Array.from(names).filter(n =>
        /east malvern|emjsc|emjs/i.test(n)
      );
      setEmjscTeams(ours);
      if (!driblTeamFilter && ours.length > 0) setDriblTeamFilter(ours[0]);
      setScrapeStatus('done');
    } catch (e: any) {
      console.error('Scrape error:', e);
      setScrapeStatus('error');
    }
  };

  // Build preview whenever filter or fixtures change
  useEffect(() => {
    if (!driblTeamFilter || fixtures.length === 0) { setPreview([]); return; }
    const matched = fixtures.filter(f =>
      f.home_team_name?.includes(driblTeamFilter) ||
      f.away_team_name?.includes(driblTeamFilter)
    ).map(f => {
      const isHome = f.home_team_name?.includes(driblTeamFilter);
      const opponent = (isHome ? f.away_team_name : f.home_team_name) || '';
      let dateISO = f.date || '';
      const kickOff = f.time || '';
      if (f.date && f.time) dateISO = `${f.date}T${f.time}:00`;
      const venue = f.venue || 'TBC';
      const field = f.field_name ? ` (${f.field_name})` : '';
      const roundRaw = f.round || '';
      const round = String(roundRaw).replace(/^round\s*/i, '').replace(/^r/i, '').trim()
        .replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '') || 'x';
      return { round, date: dateISO, kickOff, opponent, isHome, location: venue + field,
               opponentLogo: isHome ? f.away_team_logo : f.home_team_logo,
               homeTeamLogo: isHome ? f.home_team_logo : f.away_team_logo,
               mapUrl: f.map_url };
    });
    setPreview(matched);
  }, [fixtures, driblTeamFilter]);

  const syncToTeam = async () => {
    if (!selectedClub || !selectedTeam || preview.length === 0) return;
    setSyncStatus('Syncing...');
    const teamPath = `clubs/${selectedClub}/teams/${selectedTeam}`;
    let count = 0;
    try {
      for (const g of preview) {
        const gameId = `game_round_${g.round}`;
        const gameData: any = {
          date: g.date, opponent: g.opponent, location: g.location,
          isHome: g.isHome, kickOff: g.kickOff,
        };
        if (g.opponentLogo) gameData.opponentLogo = g.opponentLogo;
        if (g.homeTeamLogo) gameData.homeTeamLogo = g.homeTeamLogo;
        if (g.mapUrl) gameData.mapUrlOverride = g.mapUrl;
        await setDoc(doc(db, `${teamPath}/games/${gameId}`), gameData, { merge: true });
        count++;
      }
      // Save cache in team settings
      await setDoc(doc(db, `${teamPath}/settings/driblCache`), {
        fixtures, emjscTeams, selectedTeam: driblTeamFilter,
        savedAt: new Date().toISOString(),
      });
      setSyncStatus(`✓ ${count} fixtures synced to ${teamObj?.name}`);
      setTimeout(() => setSyncStatus(null), 5000);
    } catch (e: any) {
      setSyncStatus(`Error: ${e.message}`);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-black text-white">Fixture Sync</h2>
        <p className="text-sm text-slate-400 mt-1">
          Scrape Football Victoria fixtures from Dribl and sync to a club team.
        </p>
      </div>

      {/* Target selection */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-5">
        <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-3">Target Team</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Club</label>
            <select
              value={selectedClub}
              onChange={e => { setSelectedClub(e.target.value); setSelectedTeam(''); }}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">Select club…</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Team</label>
            <select
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
              disabled={!selectedClub || teams.length === 0}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-40"
            >
              <option value="">Select team…</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Scrape panel */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Scrape Dribl (FV)</h3>
          <button
            onClick={scrape}
            disabled={scrapeStatus === 'scraping'}
            className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black text-xs rounded-xl transition-colors"
          >
            <RefreshCw size={13} className={scrapeStatus === 'scraping' ? 'animate-spin' : ''} />
            {scrapeStatus === 'scraping' ? 'Scraping…' : 'Scrape Now'}
          </button>
        </div>

        {scrapeStatus === 'error' && (
          <p className="text-red-400 text-xs font-bold">Scrape failed — check cloud function logs.</p>
        )}

        {scrapeStatus === 'done' && fixtures.length > 0 && (
          <div className="space-y-3">
            {emjscTeams.length > 0 && (
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Filter by team name in Dribl
                </label>
                <select
                  value={driblTeamFilter}
                  onChange={e => setDriblTeamFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {emjscTeams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {preview.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 mb-2">
                  {preview.length} fixture{preview.length !== 1 ? 's' : ''} matched
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {preview.map((g, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-800 rounded-lg">
                      <span className="text-[10px] font-black text-slate-500 w-8">R{g.round}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {g.isHome ? 'vs' : '@'} {g.opponent}
                        </p>
                        <p className="text-[10px] text-slate-500">{g.date?.slice(0,10)} {g.kickOff}</p>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${g.isHome ? 'bg-emerald-900 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        {g.isHome ? 'HOME' : 'AWAY'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sync button */}
      {preview.length > 0 && selectedClub && selectedTeam && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
          <button
            onClick={syncToTeam}
            className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black text-sm rounded-xl transition-colors"
          >
            <Check size={16} />
            Sync {preview.length} Fixtures → {teamObj?.name}
          </button>
          {syncStatus && (
            <p className={`text-xs font-bold text-center mt-3 ${syncStatus.startsWith('✓') ? 'text-emerald-400' : syncStatus.startsWith('Error') ? 'text-red-400' : 'text-slate-400'}`}>
              {syncStatus}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
