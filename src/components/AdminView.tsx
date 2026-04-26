import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Shield, Users, Utensils, MessageCircle, Settings,
  HelpCircle, Lock, Unlock, AlertCircle, Trash2, RefreshCw, Zap,
  Check, X, Plus, Lightbulb, Mail, CalendarDays
} from 'lucide-react';
import { AdminCommunications } from './AdminCommunications';
import { AdminModeration } from './AdminModeration';
import { MatchEditor } from './MatchEditor';
import { DutyManager } from './DutyManager';
import { FaqManager } from './HelpView';
import { CLUB_LOGO } from '../lib/constants';

function AdminDutySelector({ label, value, onSelect, squad = [] }: any) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-50">
      <span className="text-[10px] font-black uppercase text-slate-400">{label}</span>
      <select
        value={value || ""}
        onChange={(e) => onSelect(e.target.value)}
        className="text-[10px] font-black text-emjsc-navy uppercase bg-slate-50 p-2 rounded-lg border-none focus:ring-1 focus:ring-emjsc-navy outline-none"
      >
        <option value="">(Empty)</option>
        {squad.map((p: any) => (
          <option key={p.name} value={p.name}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}

function SquadManager({ squad, onUpdate, passwords, onUpdatePasswords, staffAccounts = [], onUpdateStaff, userRole }: any) {
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editFact, setEditFact] = React.useState('');
  const [newName, setNewName] = React.useState('');
  const [newFact, setNewFact] = React.useState('');
  const [adding, setAdding] = React.useState(false);

  // Staff account management state
  const [editingStaffIdx, setEditingStaffIdx] = React.useState<number | null>(null);
  const [editStaffName, setEditStaffName] = React.useState('');
  const [editStaffRole, setEditStaffRole] = React.useState('coach');
  const [editStaffPass, setEditStaffPass] = React.useState('');
  const [editStaffTagline, setEditStaffTagline] = React.useState('');
  const [addingStaff, setAddingStaff] = React.useState(false);
  const [newStaffName, setNewStaffName] = React.useState('');
  const [newStaffRole, setNewStaffRole] = React.useState('coach');
  const [newStaffPass, setNewStaffPass] = React.useState('');
  const [newStaffTagline, setNewStaffTagline] = React.useState('');

  const startEdit = (i: number) => { setEditingIdx(i); setEditName(squad[i].name); setEditFact(squad[i].fact); };
  const saveEdit = () => {
    if (!editName.trim()) return;
    const oldName = squad[editingIdx!].name;
    const nextName = editName.trim();
    onUpdate(squad.map((p: any, i: number) => i === editingIdx ? { name: nextName, fact: editFact.trim() } : p));
    if (oldName !== nextName && passwords?.players?.[oldName] !== undefined) {
      const np = { ...passwords.players, [nextName]: passwords.players[oldName] };
      delete np[oldName];
      onUpdatePasswords({ ...passwords, players: np });
    }
    setEditingIdx(null);
  };
  const remove = (i: number) => {
    if (!window.confirm(`Remove ${squad[i].name} from the squad?`)) return;
    onUpdate(squad.filter((_: any, idx: number) => idx !== i));
  };
  const addNew = () => {
    if (!newName.trim()) return;
    onUpdate([...squad, { name: newName.trim(), fact: newFact.trim() || 'A valued member of the squad' }]);
    setNewName(''); setNewFact(''); setAdding(false);
  };

  const startEditStaff = (i: number) => {
    setEditingStaffIdx(i); setEditStaffName(staffAccounts[i].name);
    setEditStaffRole(staffAccounts[i].role); setEditStaffPass(staffAccounts[i].password);
    setEditStaffTagline(staffAccounts[i].tagline || '');
  };
  const saveEditStaff = () => {
    if (!editStaffName.trim()) return;
    onUpdateStaff(staffAccounts.map((a: any, i: number) => i === editingStaffIdx
      ? { ...a, name: editStaffName.trim(), role: editStaffRole, password: editStaffPass || a.password, tagline: editStaffTagline.trim() }
      : a));
    setEditingStaffIdx(null);
  };
  const removeStaff = (i: number) => {
    if (staffAccounts.length <= 1) return;
    if (!window.confirm(`Remove ${staffAccounts[i].name} from staff?`)) return;
    onUpdateStaff(staffAccounts.filter((_: any, idx: number) => idx !== i));
  };
  const addStaff = () => {
    if (!newStaffName.trim() || !newStaffPass.trim()) return;
    const id = `staff_${Date.now()}`;
    onUpdateStaff([...staffAccounts, { id, name: newStaffName.trim(), role: newStaffRole, password: newStaffPass.trim(), tagline: newStaffTagline.trim() }]);
    setNewStaffName(''); setNewStaffRole('coach'); setNewStaffPass(''); setNewStaffTagline(''); setAddingStaff(false);
  };

  const editPencil = (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );

  const isManager = userRole === 'manager' || !userRole;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Coaches & Staff</p>
          {isManager && !addingStaff && (
            <button onClick={() => { setAddingStaff(true); setEditingStaffIdx(null); }} className="text-[8px] font-black uppercase tracking-widest text-emjsc-navy bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 hover:bg-slate-100 flex items-center gap-1">
              <Plus className="w-2.5 h-2.5" />Add
            </button>
          )}
        </div>
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Name</th>
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Role</th>
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">Description</th>
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Password</th>
                {isManager && <th className="px-2 py-2 w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffAccounts.map((a: any, i: number) => editingStaffIdx === i ? (
                <tr key={a.id} className="bg-blue-50">
                  <td colSpan={isManager ? 5 : 4} className="px-3 py-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Name</p>
                          <input autoFocus value={editStaffName} onChange={e => setEditStaffName(e.target.value)} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none" />
                        </div>
                        <div className="w-28">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Role</p>
                          <select value={editStaffRole} onChange={e => setEditStaffRole(e.target.value)} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none">
                            <option value="coach">Coach</option>
                            <option value="manager">Manager</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Description</p>
                        <input value={editStaffTagline} onChange={e => setEditStaffTagline(e.target.value)} placeholder="Description shown on Squad page…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 outline-none" />
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Password</p>
                          <input value={editStaffPass} onChange={e => setEditStaffPass(e.target.value)} placeholder="New password…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none font-mono" />
                        </div>
                        <div className="flex gap-1 pb-0.5">
                          <button onClick={saveEditStaff} className="p-1.5 bg-emjsc-navy text-white rounded-lg"><Check className="w-3 h-3" /></button>
                          <button onClick={() => setEditingStaffIdx(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={a.id} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5"><span className="text-[10px] font-black text-emjsc-navy uppercase">{a.name}</span></td>
                  <td className="px-3 py-2.5 hidden md:table-cell"><span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${a.role === 'manager' ? 'bg-emjsc-navy/10 text-emjsc-navy' : 'bg-amber-50 text-amber-700'}`}>{a.role}</span></td>
                  <td className="px-3 py-2.5 hidden sm:table-cell"><p className="text-[9px] text-slate-500 line-clamp-1">{a.tagline || <span className="italic text-slate-300">No description</span>}</p></td>
                  <td className="px-3 py-2"><span className="text-[10px] font-mono text-slate-400">{'•'.repeat(Math.min(a.password?.length || 0, 8))}</span></td>
                  {isManager && <td className="px-2 py-2.5"><div className="flex gap-1">
                    <button onClick={() => startEditStaff(i)} className="p-1 text-emjsc-navy hover:bg-emjsc-navy/10 rounded-lg">{editPencil}</button>
                    {staffAccounts.length > 1 && <button onClick={() => removeStaff(i)} className="p-1 text-emjsc-red hover:bg-red-50 rounded-lg"><Trash2 className="w-3 h-3" /></button>}
                  </div></td>}
                </tr>
              ))}
              {addingStaff && (
                <tr className="bg-green-50 border-t border-green-100">
                  <td className="px-3 py-2"><input autoFocus value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="Full name…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none placeholder:text-slate-300" /></td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none">
                      <option value="coach">Coach</option>
                      <option value="manager">Manager</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell"><input value={newStaffTagline} onChange={e => setNewStaffTagline(e.target.value)} placeholder="Description (optional)…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 outline-none placeholder:text-slate-300" /></td>
                  <td className="px-3 py-2"><input value={newStaffPass} onChange={e => setNewStaffPass(e.target.value)} placeholder="Password…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none font-mono placeholder:text-slate-300" /></td>
                  <td className="px-2 py-2"><div className="flex gap-1">
                    <button onClick={addStaff} className="p-1 bg-green-600 text-white rounded-lg"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setAddingStaff(false)} className="p-1 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3 h-3" /></button>
                  </div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Players</p>
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Name</th>
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">Tagline</th>
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Password</th>
                <th className="px-2 py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {squad.map((p: any, i: number) => editingIdx === i ? (
                <tr key={i} className="bg-blue-50">
                  <td colSpan={4} className="px-3 py-3">
                    <div className="flex flex-col gap-2">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Name</p>
                        <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Tagline</p>
                        <input value={editFact} onChange={e => setEditFact(e.target.value)} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 outline-none" />
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Password</p>
                          <input
                            key={`${p.name}-${passwords?.players?.[p.name]}`}
                            type="text"
                            defaultValue={passwords?.players?.[p.name] || ''}
                            onBlur={(e) => onUpdatePasswords({ ...passwords, players: { ...passwords?.players, [p.name]: e.target.value.trim() || passwords?.players?.[p.name] } })}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none font-mono"
                          />
                        </div>
                        <div className="flex gap-1 pb-0.5">
                          <button onClick={saveEdit} className="p-1.5 bg-emjsc-navy text-white rounded-lg"><Check className="w-3 h-3" /></button>
                          <button onClick={() => setEditingIdx(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={i} className="bg-white hover:bg-slate-50 group transition-colors">
                  <td className="px-3 py-2.5"><span className="text-[10px] font-black text-emjsc-navy uppercase">{p.name}</span></td>
                  <td className="px-3 py-2.5 hidden sm:table-cell"><p className="text-[9px] text-slate-500 line-clamp-1">{p.fact}</p></td>
                  <td className="px-3 py-2">
                    <input
                      key={`${p.name}-${passwords?.players?.[p.name]}`}
                      type="text"
                      defaultValue={passwords?.players?.[p.name] || ''}
                      onBlur={(e) => onUpdatePasswords({ ...passwords, players: { ...passwords?.players, [p.name]: e.target.value.trim() || passwords?.players?.[p.name] } })}
                      className="w-full p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy font-mono"
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(i)} className="p-1 text-emjsc-navy hover:bg-emjsc-navy/10 rounded-lg">{editPencil}</button>
                      <button onClick={() => remove(i)} className="p-1 text-emjsc-red hover:bg-red-50 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {adding && (
                <tr className="bg-green-50 border-t border-green-100">
                  <td className="px-3 py-2">
                    <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Player name…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none placeholder:text-slate-300" />
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell">
                    <input value={newFact} onChange={e => setNewFact(e.target.value)} placeholder="Tagline (optional)…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 outline-none placeholder:text-slate-300" />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[9px] text-slate-300 font-bold italic">Set after saving</span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button onClick={addNew} className="p-1 bg-green-600 text-white rounded-lg"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setAdding(false)} className="p-1 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditingIdx(null); }} className="w-full bg-slate-50 text-emjsc-navy border border-slate-200 font-black py-2.5 rounded-xl uppercase tracking-[0.1em] text-[9px] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <Plus className="w-3.5 h-3.5" />Add Player
          </button>
        )}
      </div>
    </div>
  );
}

// ── Short name helpers ────────────────────────────────────────────────────────

/** Extract the EMJSC team identifier from a full Dribl team string. */
function emjscShortName(fullName: string): string {
  const m = fullName.match(/EMJS[C]?\s+(.*)/i);
  return m ? m[1].trim() : fullName;
}

/** Best-effort short club name for the opponent column. */
function opponentShort(fullName: string): string {
  // Strip everything from " U0" onwards (e.g. " U08 MiniRoos - Joeys Mixed ...")
  return fullName.replace(/\s+U\d{2}\s+.*/i, '').trim();
}

// ── CoachPlayerDutiesPanel ────────────────────────────────────────────────────

function CoachPlayerDutiesPanel({ games, dutiesConfig, squad, onManualAssign }: any) {
  const playerDuties = (dutiesConfig as any[]).filter((d: any) => !d.type || d.type === 'player');
  const upcoming = [...(games as any[])]
    .filter((g: any) => g.date && new Date(g.date) >= new Date(Date.now() - 24 * 60 * 60 * 1000))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (upcoming.length === 0) return (
    <p className="text-center text-[10px] font-black uppercase text-slate-400 py-8 italic">No upcoming games</p>
  );

  return (
    <div className="space-y-4">
      {upcoming.map((game: any) => {
        const dateStr = new Date(game.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
        const applicableDuties = playerDuties.filter((d: any) => {
          const at = d.applicableTo;
          if (!at || at === 'both') return true;
          if (at === 'home' && game.isHome) return true;
          if (at === 'away' && !game.isHome) return true;
          return false;
        });
        return (
          <div key={game.id} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${game.isHome ? 'bg-emjsc-navy' : 'bg-amber-400'}`} />
              <div>
                <p className="text-[10px] font-black uppercase text-emjsc-navy leading-none">
                  vs {game.opponent?.split(' - ')[0] || game.opponent || 'TBC'}
                </p>
                <p className="text-[8px] font-bold uppercase text-slate-400 mt-0.5">
                  {dateStr} · {game.isHome ? 'Home' : 'Away'}
                </p>
              </div>
            </div>
            {applicableDuties.length === 0 ? (
              <p className="text-[9px] text-slate-300 font-bold italic">No player duties for this game</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {applicableDuties.map((duty: any) => {
                  const current = (game.assignments && game.assignments[duty.id]) || '';
                  return (
                    <AdminDutySelector
                      key={duty.id}
                      label={duty.label}
                      value={current}
                      onSelect={(val: string) => onManualAssign(game.id, duty.id, val)}
                      squad={squad}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── DriblScrapePanel ──────────────────────────────────────────────────────────

export type DriblCompetition = { id: string; name: string; season: string };
export type DriblClub = { id: string; name: string };
export type DriblCache = {
  fixtures: any[];
  allTeams: string[];
  selectedClub?: string;
  selectedTeam: string;
  savedAt: string;
  competition?: DriblCompetition;
  club?: DriblClub;
  availableCompetitions?: DriblCompetition[];
  availableClubs?: { [competitionId: string]: DriblClub[] };
  listsCachedAt?: string;
  fixtureCache?: { [key: string]: { fixtures: any[]; allTeams: string[]; scrapedAt: string } };
};

function extractClubName(fullName: string): string {
  const m = fullName.match(/^(.*?)\s+U\d{2,3}\b/i);
  return m ? m[1].trim() : fullName;
}

function teamDisplayName(fullName: string): string {
  return fullName
    .replace(/\s*U\d{2,3}\s+MiniRoos\s*-\s*Joeys Mixed\s*/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function teamWithinClubName(fullName: string, clubName: string): string {
  const display = teamDisplayName(fullName);
  if (clubName && display.toLowerCase().startsWith(clubName.toLowerCase())) {
    return display.slice(clubName.length).trim();
  }
  return display;
}

function findTeamLogo(fixtures: any[], teamName: string): string | null {
  for (const f of fixtures) {
    if ((f.home_team_name || '').includes(teamName) && f.home_team_logo) return f.home_team_logo;
    if ((f.away_team_name || '').includes(teamName) && f.away_team_logo) return f.away_team_logo;
  }
  return null;
}

function buildFixtureUrl(competition: DriblCompetition, club: DriblClub): string {
  const p = new URLSearchParams({
    date_range: 'all',
    season: competition.season,
    competition: competition.id,
    club: club.id,
    timezone: 'Australia/Melbourne',
  });
  return `https://fv.dribl.com/fixtures/?${p}`;
}

type ScrapePhase =
  | { tag: 'select'; loadingComps: boolean; competitions: DriblCompetition[]; compId: string; loadingClubs: boolean; clubs: DriblClub[]; clubId: string; compsCachedAt?: string; clubsCachedAt?: string; error?: string }
  | { tag: 'syncing'; competition: DriblCompetition; club: DriblClub }
  | { tag: 'preview'; competition: DriblCompetition; club: DriblClub; allFixtures: any[]; allTeams: string[]; selectedTeamClub: string; selectedTeam: string; cachedAt?: string; saving?: boolean; savedCount?: number }
  | { tag: 'error'; message: string };

function DriblScrapePanel({ onFetchCompetitions, onFetchClubs, onFetchDribl, onConfirmSync, driblCache, onSaveDriblCache }: {
  onFetchCompetitions: (forceRefresh?: boolean) => Promise<{ competitions: DriblCompetition[]; cachedAt?: string }>;
  onFetchClubs: (competitionId: string, season: string, forceRefresh?: boolean) => Promise<{ clubs: DriblClub[]; cachedAt?: string }>;
  onFetchDribl: (url: string) => Promise<{ fixtures: any[]; debug: any } | null>;
  onConfirmSync: (fixtures: any[], teamName: string, teamLogoUrl?: string) => Promise<void>;
  driblCache: DriblCache | null;
  onSaveDriblCache: (cache: DriblCache) => Promise<void>;
}) {
  const initPhase = (): ScrapePhase => {
    if (driblCache?.fixtures?.length && driblCache.competition && driblCache.club) {
      const selectedTeam = driblCache.selectedTeam;
      const selectedTeamClub = driblCache.selectedClub || extractClubName(selectedTeam);
      return { tag: 'preview', competition: driblCache.competition, club: driblCache.club, allFixtures: driblCache.fixtures, allTeams: driblCache.allTeams, selectedTeamClub, selectedTeam, cachedAt: driblCache.savedAt };
    }
    // Start empty — Firestore restore effect will populate once the snapshot arrives
    return { tag: 'select', loadingComps: false, competitions: [], compId: '', loadingClubs: false, clubs: [], clubId: '' };
  };

  const [phase, setPhase] = React.useState<ScrapePhase>(initPhase);

  // Persists across phase transitions so going back to select is instant.
  const listsRef = React.useRef<{
    competitions: DriblCompetition[];
    compsCachedAt?: string;
    clubsByCompId: Map<string, { clubs: DriblClub[]; cachedAt?: string }>;
  }>({ competitions: [], clubsByCompId: new Map() });

  // Populate from Firestore once the snapshot arrives (or whenever cache updates).
  // Handles both preview restoration and competition/club list hydration.
  React.useEffect(() => {
    if (!driblCache) return;

    // Hydrate the in-memory ref so resetToSelect() is instant
    if (driblCache.availableCompetitions?.length) {
      listsRef.current.competitions = driblCache.availableCompetitions;
      listsRef.current.compsCachedAt = driblCache.listsCachedAt;
      if (driblCache.availableClubs) {
        for (const [id, clubs] of Object.entries(driblCache.availableClubs)) {
          if (!listsRef.current.clubsByCompId.has(id)) {
            listsRef.current.clubsByCompId.set(id, { clubs, cachedAt: driblCache.listsCachedAt });
          }
        }
      }
    }

    setPhase(prev => {
      // Don't overwrite a phase that's already meaningful
      if (prev.tag !== 'select' || prev.competitions.length > 0 || prev.loadingComps) return prev;

      // Restore to preview if fixtures are synced
      if (driblCache.fixtures?.length && driblCache.competition && driblCache.club) {
        const selectedTeam = driblCache.selectedTeam;
        const selectedTeamClub = driblCache.selectedClub || extractClubName(selectedTeam);
        return { tag: 'preview', competition: driblCache.competition!, club: driblCache.club!, allFixtures: driblCache.fixtures, allTeams: driblCache.allTeams, selectedTeamClub, selectedTeam, cachedAt: driblCache.savedAt };
      }

      // Populate select phase from cached lists
      if (driblCache.availableCompetitions?.length) {
        const competitions = driblCache.availableCompetitions;
        const prefCompId = driblCache.competition?.id || competitions[0]?.id || '';
        const cachedClubs = driblCache.availableClubs?.[prefCompId];
        return {
          tag: 'select',
          loadingComps: false,
          competitions,
          compId: prefCompId,
          compsCachedAt: driblCache.listsCachedAt,
          loadingClubs: !cachedClubs,
          clubs: cachedClubs ?? [],
          clubId: driblCache.club?.id || cachedClubs?.[0]?.id || '',
          clubsCachedAt: cachedClubs ? driblCache.listsCachedAt : undefined,
        };
      }

      return prev;
    });
  }, [driblCache]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadClubs = React.useCallback(async (competition: DriblCompetition, compIdToSet: string, forceRefresh = false) => {
    setPhase(prev => prev.tag === 'select' ? { ...prev, compId: compIdToSet, loadingClubs: true, clubs: [], clubId: '', clubsCachedAt: undefined, error: undefined } : prev);
    try {
      const { clubs, cachedAt } = await onFetchClubs(competition.id, competition.season, forceRefresh);
      listsRef.current.clubsByCompId.set(competition.id, { clubs, cachedAt });
      setPhase(prev => prev.tag === 'select' ? { ...prev, loadingClubs: false, clubs, clubId: clubs[0]?.id ?? '', clubsCachedAt: cachedAt } : prev);
    } catch (err: any) {
      setPhase(prev => prev.tag === 'select' ? { ...prev, loadingClubs: false, error: `Failed to load clubs: ${err.message}` } : prev);
    }
  }, [onFetchClubs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load clubs on mount when competitions are known but clubs aren't cached yet
  React.useEffect(() => {
    if (phase.tag !== 'select' || !phase.loadingClubs || !phase.compId || !phase.competitions.length) return;
    const competition = phase.competitions.find(c => c.id === phase.compId);
    if (competition) loadClubs(competition, phase.compId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeCompetition = (compId: string) => {
    if (phase.tag !== 'select') return;
    const competition = phase.competitions.find(c => c.id === compId);
    if (!competition) return;
    const cached = listsRef.current.clubsByCompId.get(compId);
    if (cached) {
      setPhase(prev => prev.tag === 'select' ? { ...prev, compId, loadingClubs: false, clubs: cached.clubs, clubId: cached.clubs[0]?.id ?? '', clubsCachedAt: cached.cachedAt, error: undefined } : prev);
    } else {
      loadClubs(competition, compId);
    }
  };

  const refreshClubs = async () => {
    if (phase.tag !== 'select' || phase.loadingClubs) return;
    const competition = phase.competitions.find(c => c.id === phase.compId);
    if (!competition) return;
    setPhase(prev => prev.tag === 'select' ? { ...prev, loadingClubs: true, clubs: [], clubsCachedAt: undefined, error: undefined } : prev);
    try {
      const { clubs, cachedAt } = await onFetchClubs(competition.id, competition.season, true);
      listsRef.current.clubsByCompId.set(competition.id, { clubs, cachedAt });
      setPhase(prev => prev.tag === 'select' ? { ...prev, loadingClubs: false, clubs, clubId: clubs.find(c => c.id === (prev.tag === 'select' ? prev.clubId : ''))?.id ?? clubs[0]?.id ?? '', clubsCachedAt: cachedAt } : prev);
      const newAvailableClubs = { ...(driblCache?.availableClubs ?? {}), [competition.id]: clubs };
      await onSaveDriblCache({
        ...(driblCache ?? { fixtures: [], allTeams: [], selectedTeam: '', savedAt: new Date().toISOString() }),
        availableClubs: newAvailableClubs,
        listsCachedAt: cachedAt,
      });
    } catch (err: any) {
      setPhase(prev => prev.tag === 'select' ? { ...prev, loadingClubs: false, error: `Failed to refresh clubs: ${err.message}` } : prev);
    }
  };

  const refreshCompetitions = async () => {
    if (phase.tag !== 'select' || phase.loadingComps) return;
    setPhase(prev => prev.tag === 'select' ? { ...prev, loadingComps: true, competitions: [], compsCachedAt: undefined } : prev);
    try {
      const { competitions, cachedAt } = await onFetchCompetitions(true);
      listsRef.current.competitions = competitions;
      listsRef.current.compsCachedAt = cachedAt;
      listsRef.current.clubsByCompId.clear();
      const compId = competitions[0]?.id ?? '';
      setPhase(prev => prev.tag === 'select' ? { ...prev, loadingComps: false, competitions, compId, compsCachedAt: cachedAt } : prev);
      await onSaveDriblCache({
        ...(driblCache ?? { fixtures: [], allTeams: [], selectedTeam: '', savedAt: new Date().toISOString() }),
        availableCompetitions: competitions,
        availableClubs: {},
        listsCachedAt: cachedAt,
      });
      if (competitions[0]) loadClubs(competitions[0], compId, true);
    } catch (err: any) {
      setPhase(prev => prev.tag === 'select' ? { ...prev, loadingComps: false, error: err.message } : prev);
    }
  };

  const startSync = async (forceRefresh = false) => {
    if (phase.tag !== 'select') return;
    const competition = phase.competitions.find(c => c.id === phase.compId);
    const club = phase.clubs.find(c => c.id === phase.clubId);
    if (!competition || !club) return;

    const cacheKey = `${competition.id}:${club.id}`;
    const cachedEntry = !forceRefresh ? driblCache?.fixtureCache?.[cacheKey] : null;

    if (cachedEntry) {
      const ourTeams = cachedEntry.allTeams.filter(t => extractClubName(t).toLowerCase() === club.name.toLowerCase());
      const firstTeam = ourTeams[0] ?? cachedEntry.allTeams[0] ?? '';
      setPhase({ tag: 'preview', competition, club, allFixtures: cachedEntry.fixtures, allTeams: cachedEntry.allTeams, selectedTeamClub: extractClubName(firstTeam), selectedTeam: firstTeam, cachedAt: cachedEntry.scrapedAt });
      return;
    }

    setPhase({ tag: 'syncing', competition, club });
    const url = buildFixtureUrl(competition, club);
    try {
      const result = await onFetchDribl(url);
      if (!result || result.fixtures.length === 0) {
        setPhase({ tag: 'error', message: `No fixtures found for ${club.name}. Try a different club or check the local dev server is running.` });
        return;
      }
      const teamSet = new Set<string>();
      for (const f of result.fixtures) {
        if (f.home_team_name) teamSet.add(f.home_team_name);
        if (f.away_team_name) teamSet.add(f.away_team_name);
      }
      const allTeams = Array.from(teamSet).sort();
      const ourTeams = allTeams.filter(t => extractClubName(t).toLowerCase() === club.name.toLowerCase());
      const firstTeam = ourTeams[0] ?? allTeams[0] ?? '';
      const selectedTeamClub = extractClubName(firstTeam);
      const scrapedAt = new Date().toISOString();
      const newFixtureCache = { ...(driblCache?.fixtureCache ?? {}), [cacheKey]: { fixtures: result.fixtures, allTeams, scrapedAt } };
      const cache: DriblCache = { fixtures: result.fixtures, allTeams, selectedClub: selectedTeamClub, selectedTeam: firstTeam, savedAt: scrapedAt, competition, club, fixtureCache: newFixtureCache };
      await onSaveDriblCache(cache);
      setPhase({ tag: 'preview', competition, club, allFixtures: result.fixtures, allTeams, selectedTeamClub, selectedTeam: firstTeam, cachedAt: scrapedAt });
    } catch (err: any) {
      setPhase({ tag: 'error', message: err?.message || 'Sync failed' });
    }
  };

  const confirmSync = async () => {
    if (phase.tag !== 'preview' || phase.saving) return;
    const { competition, club, allFixtures, allTeams, selectedTeamClub, selectedTeam, cachedAt } = phase;
    const teamLogo = findTeamLogo(allFixtures, selectedTeam) ?? undefined;
    setPhase({ ...phase, saving: true });
    try {
      await onConfirmSync(allFixtures, selectedTeam, teamLogo);
      const count = allFixtures.filter(f => (f.home_team_name || '').includes(selectedTeam) || (f.away_team_name || '').includes(selectedTeam)).length;
      setPhase({ tag: 'preview', competition, club, allFixtures, allTeams, selectedTeamClub, selectedTeam, cachedAt, saving: false, savedCount: count });
    } catch (err: any) {
      setPhase({ tag: 'error', message: err?.message || 'Save failed' });
    }
  };

  const resetToSelect = () => {
    const lists = listsRef.current;
    if (lists.competitions.length > 0) {
      const prefCompId = phase.tag === 'preview' ? phase.competition.id : lists.competitions[0]?.id ?? '';
      const prefClubId = phase.tag === 'preview' ? phase.club.id : '';
      const cachedClubs = lists.clubsByCompId.get(prefCompId);
      const clubId = cachedClubs?.clubs.find(c => c.id === prefClubId)?.id ?? cachedClubs?.clubs[0]?.id ?? '';
      setPhase({
        tag: 'select',
        loadingComps: false,
        competitions: lists.competitions,
        compId: prefCompId,
        compsCachedAt: lists.compsCachedAt,
        loadingClubs: !cachedClubs,
        clubs: cachedClubs?.clubs ?? [],
        clubId,
        clubsCachedAt: cachedClubs?.cachedAt,
      });
      if (!cachedClubs) {
        const comp = lists.competitions.find(c => c.id === prefCompId);
        if (comp) loadClubs(comp, prefCompId);
      }
    } else {
      setPhase({ tag: 'select', loadingComps: false, competitions: [], compId: '', loadingClubs: false, clubs: [], clubId: '', compsCachedAt: undefined, clubsCachedAt: undefined });
    }
  };

  // ── Select phase ──
  if (phase.tag === 'select') {
    const { loadingComps, competitions, compId, loadingClubs, clubs, clubId, compsCachedAt, clubsCachedAt, error } = phase;
    const canSync = !loadingComps && !loadingClubs && compId && clubId;

    const fmtCachedAt = (iso?: string) => {
      if (!iso) return null;
      const diff = Date.now() - new Date(iso).getTime();
      if (diff < 60_000) return 'just now';
      if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
      if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
      return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    };

    return (
      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emjsc-navy">Sync Fixtures</p>

        {error && (
          <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-[9px] font-black uppercase text-emjsc-red mb-0.5">Error</p>
            <p className="text-[9px] text-red-700 font-medium">{error}</p>
            <button onClick={resetToSelect} className="mt-2 text-[9px] font-black uppercase text-emjsc-navy underline">Try Again</button>
          </div>
        )}

        {/* Competition */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">1. Competition</p>
            {!loadingComps && competitions.length > 0 && (
              <button
                onClick={refreshCompetitions}
                className="flex items-center gap-1 text-[8px] font-black uppercase text-slate-400 hover:text-emjsc-navy transition-colors"
                title="Re-sync competition list from FV website"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                {compsCachedAt ? fmtCachedAt(compsCachedAt) : 'Refresh'}
              </button>
            )}
          </div>
          {loadingComps ? (
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />
              <span className="text-[9px] text-slate-400 font-medium">Loading from FV…</span>
            </div>
          ) : competitions.length === 0 ? (
            <button
              onClick={refreshCompetitions}
              className="w-full flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 border-dashed rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-emjsc-navy hover:border-emjsc-navy/40 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Load competitions from FV
            </button>
          ) : (
            <select
              value={compId}
              onChange={e => changeCompetition(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black text-emjsc-navy uppercase tracking-tight outline-none focus:ring-1 focus:ring-emjsc-navy"
            >
              {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {/* Club */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">2. Club</p>
            {!loadingClubs && clubs.length > 0 && (
              <button
                onClick={refreshClubs}
                className="flex items-center gap-1 text-[8px] font-black uppercase text-slate-400 hover:text-emjsc-navy transition-colors"
                title="Refresh clubs from FV website"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                {clubsCachedAt ? fmtCachedAt(clubsCachedAt) : 'Refresh'}
              </button>
            )}
          </div>
          {loadingClubs ? (
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />
              <span className="text-[9px] text-slate-400 font-medium">Loading clubs from FV…</span>
            </div>
          ) : (
            <select
              value={clubId}
              onChange={e => setPhase(prev => prev.tag === 'select' ? { ...prev, clubId: e.target.value } : prev)}
              disabled={clubs.length === 0}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black text-emjsc-navy uppercase tracking-tight outline-none focus:ring-1 focus:ring-emjsc-navy disabled:opacity-40"
            >
              {clubs.length === 0 && <option value="">Select a competition first</option>}
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {(() => {
          const fixtureEntry = compId && clubId ? driblCache?.fixtureCache?.[`${compId}:${clubId}`] : null;
          return fixtureEntry ? (
            <div className="flex items-center justify-between px-1">
              <span className="text-[8px] font-black uppercase text-slate-400">Cached {fmtCachedAt(fixtureEntry.scrapedAt)}</span>
              <button
                onClick={() => startSync(true)}
                className="flex items-center gap-1 text-[8px] font-black uppercase text-slate-400 hover:text-emjsc-navy transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Force re-scrape
              </button>
            </div>
          ) : null;
        })()}

        <button
          onClick={() => startSync()}
          disabled={!canSync}
          className="w-full bg-emjsc-navy text-white text-[10px] font-black uppercase py-4 rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 disabled:opacity-40"
        >
          <Zap className="w-4 h-4 text-yellow-300" />
          Sync Fixtures
        </button>

        {driblCache?.fixtures.length && driblCache.competition && driblCache.club && (
          <button
            onClick={() => {
              const { competition, club, fixtures, allTeams, selectedTeam, selectedClub, savedAt } = driblCache;
              setPhase({ tag: 'preview', competition: competition!, club: club!, allFixtures: fixtures, allTeams, selectedTeamClub: selectedClub || extractClubName(selectedTeam), selectedTeam, cachedAt: savedAt });
            }}
            className="w-full bg-slate-50 text-slate-400 text-[9px] font-black uppercase py-2.5 rounded-2xl border border-slate-200"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  // ── Syncing ──
  if (phase.tag === 'syncing') return (
    <div className="w-full bg-emjsc-navy/10 border border-emjsc-navy/20 rounded-2xl p-5 flex items-center gap-3">
      <RefreshCw className="w-4 h-4 text-emjsc-navy animate-spin shrink-0" />
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emjsc-navy">Loading Fixtures…</p>
        <p className="text-[9px] text-slate-400 font-medium mt-0.5">{phase.competition.name} · {phase.club.name} · ~30s</p>
      </div>
    </div>
  );

  // ── Error ──
  if (phase.tag === 'error') return (
    <div className="space-y-3">
      <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emjsc-red mb-1">Sync Failed</p>
        <p className="text-[10px] text-red-700 font-medium">{phase.message}</p>
      </div>
      <button onClick={resetToSelect} className="w-full bg-emjsc-navy text-white text-[10px] font-black uppercase py-3 rounded-2xl flex items-center justify-center gap-2">
        <RefreshCw className="w-3.5 h-3.5" />Start Over
      </button>
    </div>
  );

  // ── Preview ──
  const { competition, club, allFixtures, allTeams, selectedTeamClub, selectedTeam, cachedAt, saving, savedCount } = phase as Extract<ScrapePhase, { tag: 'preview' }>;
  const clubTeams = allTeams.filter(t => extractClubName(t).toLowerCase() === selectedTeamClub.toLowerCase());
  const teamFixtures = allFixtures
    .filter(f => (f.home_team_name || '').includes(selectedTeam) || (f.away_team_name || '').includes(selectedTeam))
    .sort((a, b) => Number(a.round) - Number(b.round));
  const teamLogo = findTeamLogo(allFixtures, selectedTeam);
  const cachedLabel = cachedAt ? new Date(cachedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emjsc-navy">{competition.name} · {club.name}</p>
          <p className="text-[9px] text-slate-400 font-medium mt-0.5">{cachedLabel ? `Synced ${cachedLabel}` : `${allFixtures.length} fixtures`}</p>
        </div>
        <button onClick={resetToSelect} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-emjsc-navy text-[9px] font-black uppercase rounded-xl border border-slate-200 transition-colors">
          <RefreshCw className="w-3 h-3" />Change
        </button>
      </div>

      {/* Team selector */}
      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Select your team</p>
        <div className="flex items-center gap-2">
          {teamLogo && <img src={teamLogo} alt="" className="w-8 h-8 object-contain rounded shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
          <select
            value={selectedTeam}
            onChange={e => setPhase({ ...phase, selectedTeam: e.target.value, savedCount: undefined })}
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black text-emjsc-navy uppercase tracking-tight outline-none focus:ring-1 focus:ring-emjsc-navy"
          >
            {(clubTeams.length > 0 ? clubTeams : allTeams).map(t => (
              <option key={t} value={t}>{teamWithinClubName(t, selectedTeamClub)}</option>
            ))}
          </select>
        </div>
        {teamLogo && <p className="text-[9px] text-slate-400 font-medium">Team logo found — will update app logo on save</p>}
      </div>

      {/* Fixture preview table */}
      {teamFixtures.length === 0 ? (
        <p className="text-[10px] text-slate-400 font-medium text-center py-4">No fixtures found for this team</p>
      ) : (
        <div className="border border-slate-100 rounded-2xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr>
                  <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Rd</th>
                  <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">KO</th>
                  <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">H/A</th>
                  <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Opponent</th>
                  <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Venue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {teamFixtures.map((f, i) => {
                  const isHome = (f.home_team_name || '').includes(selectedTeam);
                  const opponent = isHome ? f.away_team_name : f.home_team_name;
                  const oppLogo = isHome ? f.away_team_logo : f.home_team_logo;
                  const dateStr = f.date ? new Date(f.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—';
                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 text-[10px] font-black text-emjsc-navy">{f.round ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[10px] font-semibold text-slate-600 whitespace-nowrap">{dateStr}</td>
                      <td className="px-3 py-2.5 text-[10px] font-semibold text-slate-600">{f.time ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${isHome ? 'bg-emjsc-navy/10 text-emjsc-navy border-emjsc-navy/20' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {isHome ? 'H' : 'A'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {oppLogo && <img src={oppLogo} alt="" className="w-5 h-5 object-contain rounded shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                          <span className="text-[10px] font-semibold text-slate-700 truncate max-w-[120px]">{opponentShort(opponent ?? '—')}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[9px] text-slate-500 truncate max-w-[140px]">{f.venue ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
            <p className="text-[9px] font-bold text-slate-400">{teamFixtures.length} fixtures · logos &amp; map links included</p>
          </div>
        </div>
      )}

      {savedCount !== undefined && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-green-700">{savedCount} fixture{savedCount !== 1 ? 's' : ''} saved · app logo updated</p>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={resetToSelect} disabled={saving} className="flex-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase py-3.5 rounded-2xl border border-slate-200 active:scale-[0.98] transition-all disabled:opacity-40">
          Start Over
        </button>
        <button onClick={confirmSync} disabled={teamFixtures.length === 0 || saving} className="flex-[2] bg-emjsc-navy text-white text-[10px] font-black uppercase py-3.5 rounded-2xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
          {saving ? 'Saving…' : `Save ${teamFixtures.length} Fixture${teamFixtures.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}

// ── TrainingScheduleManager ───────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function TrainingScheduleManager({ schedule, onUpdate, userRole }: { schedule: any[]; onUpdate: (s: any[]) => void; userRole: string }) {
  const isManager = userRole !== 'coach';
  const [showAdd, setShowAdd] = React.useState(false);
  const [newDay, setNewDay] = React.useState('Wednesday');
  const [newTime, setNewTime] = React.useState('17:00');
  const [newLocation, setNewLocation] = React.useState('');

  const toggleCancel = (id: string) => {
    onUpdate(schedule.map(s => s.id === id ? { ...s, cancelled: !s.cancelled } : s));
  };

  const deleteSession = (id: string) => {
    if (!window.confirm('Remove this training session?')) return;
    onUpdate(schedule.filter(s => s.id !== id));
  };

  const addSession = () => {
    if (!newLocation.trim()) return;
    const id = `${newDay.toLowerCase()}_${newTime.replace(':', '')}_${Date.now()}`;
    onUpdate([...schedule, { id, day: newDay, time: newTime, location: newLocation.trim(), cancelled: false }]);
    setNewLocation(''); setShowAdd(false);
  };

  // Format HH:MM to "5:00 PM"
  const fmtTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Weekly Training Schedule</h3>
        {isManager && (
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emjsc-navy text-white text-[9px] font-black uppercase rounded-xl active:scale-95 transition-all">
            <Plus className="w-3.5 h-3.5" />{showAdd ? 'Cancel' : 'Add Session'}
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && isManager && (
        <div className="px-6 py-4 bg-green-50 border-b border-green-100 space-y-3">
          <p className="text-[8px] font-black uppercase text-green-700 tracking-widest">New Training Session</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-400">Day</label>
              <select value={newDay} onChange={e => setNewDay(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none">
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-400">Time</label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-400">Location</label>
              <input type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)}
                placeholder="Gardiner Park" autoFocus
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none" />
            </div>
          </div>
          <button onClick={addSession} disabled={!newLocation.trim()}
            className="w-full bg-green-600 text-white text-[9px] font-black uppercase py-2.5 rounded-xl active:scale-[0.98] transition-all disabled:opacity-40">
            Add Session
          </button>
        </div>
      )}

      {/* Session list */}
      {schedule.length === 0 ? (
        <p className="text-center text-[10px] font-black uppercase text-slate-300 py-8 italic">No sessions configured</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {schedule.map((s: any) => (
            <div key={s.id} className={`flex items-center gap-3 px-6 py-4 ${s.cancelled ? 'bg-red-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-emjsc-navy uppercase">{s.day}</span>
                  <span className="text-[10px] font-bold text-slate-400">{fmtTime(s.time)}</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{s.location}</span>
                  {s.cancelled && (
                    <span className="text-[8px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">Cancelled</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleCancel(s.id)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${s.cancelled ? 'bg-green-500 text-white' : 'bg-emjsc-red text-white'}`}
                >
                  {s.cancelled ? 'Re-open' : 'Cancel'}
                </button>
                {isManager && (
                  <button onClick={() => deleteSession(s.id)}
                    className="p-2 text-slate-400 hover:text-emjsc-red hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminView({
  userName,
  games,
  isLoggedIn,
  password,
  onPasswordChange,
  onLogin,
  loginError,
  onAutoAllocate,
  onClearDuties,
  adminActionStatus,
  onManualAssign,
  onSaveGame,
  trainingCancelled,
  onToggleTraining,
  trainingSchedule = [],
  onUpdateTrainingSchedule,
  trainingLocation,
  onUpdateTrainingLocation,
  homeGround,
  onUpdateHomeGround,
  teamLogoUrl,
  onUpdateTeamLogoUrl,
  onBulkSync,
  onFetchCompetitions,
  onFetchClubs,
  onFetchDribl,
  onConfirmSync,
  driblCache = null,
  onSaveDriblCache,
  onClearSchedule,
  onDeleteGame,
  coachChild,
  onUpdateCoachChild,
  coachExemptDuties,
  onUpdateCoachExemptDuties,
  feedbacks,
  messages,
  blocks,
  announcements,
  onUpdateFeedback,
  onAdminDeleteMessage,
  onAdminDeleteBlock,
  onAddAnnouncement,
  onUpdateAnnouncement: handleUpdateAnnouncement,
  onDeleteAnnouncement,
  availabilities,
  messagingEnabled,
  onUpdateMessagingEnabled,
  dutiesConfig,
  onUpdateDutyConfig,
  onAddDutyConfig,
  onDeleteDutyConfig,
  onAddGame,
  faqItems = [],
  onAddFaqItem,
  onUpdateFaqItem,
  onDeleteFaqItem,
  onResetFaq,
  passwords,
  onUpdatePasswords,
  squad = [],
  onUpdateSquad,
  userRole,
  staffAccounts = [],
  onUpdateStaff,
  featureRequests = [],
  onMarkFeatureReviewed,
  onDeleteFeatureRequest,
  notificationSettings = {},
  onUpdateNotificationSettings,
  calendarVersion = 0,
  calendarUpdatedAt = null,
  onForceCalendarRefresh,
}: any) {
  const [bulkJson, setBulkJson] = useState('');
  const [fixtureIntegrationOpen, setFixtureIntegrationOpen] = useState(false);
  const isCoach = userRole === 'coach';
  const [activeTab, setActiveTab] = useState(isCoach ? 'content' : 'fixture');

  if (!isLoggedIn) {
    return (
      <div className="max-w-sm mx-auto space-y-6 pt-12">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emjsc-navy rounded-full flex items-center justify-center mx-auto text-white shadow-xl">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight text-emjsc-navy">Admin Access</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Authorized Club Officials Only</p>
        </div>
        <div className="space-y-3">
          {loginError && (
            <div className="bg-red-50 text-red-600 text-[10px] font-black uppercase px-4 py-2 rounded-xl border border-red-100 flex items-center justify-center gap-2">
              <AlertCircle className="w-3 h-3" />
              {loginError}
            </div>
          )}
          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLogin()}
            className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emjsc-navy outline-none font-bold text-center"
          />
          <button
            onClick={onLogin}
            className="w-full bg-emjsc-navy text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-xs"
          >
            <Unlock className="w-4 h-4" />
            Unlock Admin Hub
          </button>
        </div>
      </div>
    );
  }

  const newFeatureCount = (featureRequests as any[]).filter((r: any) => r.status !== 'reviewed').length;

  const tabs = isCoach
    ? [
        { id: 'content', label: 'Coaching', icon: <MessageCircle className="w-3 h-3" /> },
        { id: 'playerduties', label: 'Player Duties', icon: <Users className="w-3 h-3" /> },
        { id: 'training', label: 'Training', icon: <Calendar className="w-3 h-3" /> },
      ]
    : [
        { id: 'fixture', label: 'Fixture', icon: <Calendar className="w-3 h-3" /> },
        { id: 'content', label: 'Coaching', icon: <MessageCircle className="w-3 h-3" /> },
        { id: 'training', label: 'Training', icon: <CalendarDays className="w-3 h-3" /> },
        ...(messagingEnabled ? [{ id: 'moderate', label: 'Moderation', icon: <Shield className="w-3 h-3" /> }] : []),
        { id: 'duties', label: 'Duties', icon: <Utensils className="w-3 h-3" /> },
        { id: 'squad', label: 'Squad', icon: <Users className="w-3 h-3" /> },
        { id: 'faq', label: 'FAQ', icon: <HelpCircle className="w-3 h-3" /> },
        { id: 'features', label: 'Features', icon: <Lightbulb className="w-3 h-3" />, badge: newFeatureCount },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-3 h-3" /> },
      ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight text-emjsc-navy uppercase">Admin Hub</h2>
          {(() => {
            const cancelled = (trainingSchedule as any[]).filter((s: any) => s.cancelled);
            const showBadge = cancelled.length > 0 || (trainingSchedule.length === 0 && trainingCancelled);
            if (!showBadge) return null;
            const label = cancelled.length > 0
              ? cancelled.map((s: any) => `${s.day} ${s.time}`).join(' & ') + ' Cancelled'
              : 'Training Cancelled';
            return (
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emjsc-red animate-pulse" />
                <span className="text-[8px] font-black uppercase text-slate-500">{label}</span>
              </div>
            );
          })()}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-2 -mx-2 px-2 custom-scrollbar no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 border ${
                activeTab === tab.id
                  ? 'bg-emjsc-navy text-white border-emjsc-navy shadow-lg shadow-blue-900/20'
                  : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {(tab as any).badge > 0 && (
                <span className="bg-emjsc-red text-white text-[7px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center shrink-0">{(tab as any).badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {adminActionStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-[10px] font-black uppercase px-6 py-3 rounded-2xl text-center shadow-lg border-b-4 ${
            adminActionStatus.includes('Failed')
              ? 'bg-emjsc-red text-white border-red-800'
              : 'bg-green-600 text-white border-green-800'
          }`}
        >
          {adminActionStatus}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'playerduties' && (
          <motion.div key="playerduties" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Player Duty Assignments</h3>
              <p className="text-[9px] text-slate-400 font-medium">Override player duty assignments for upcoming games. Parent duties (snacks, referee, pitch marshal) are managed by the team manager.</p>
              <CoachPlayerDutiesPanel
                games={games}
                dutiesConfig={dutiesConfig}
                squad={squad}
                onManualAssign={onManualAssign}
              />
            </div>
          </motion.div>
        )}

        {activeTab === 'content' && (
          <motion.div key="content" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <AdminCommunications
              announcements={announcements}
              onAddAnnouncement={onAddAnnouncement}
              onDeleteAnnouncement={onDeleteAnnouncement}
              onUpdateAnnouncement={handleUpdateAnnouncement}
              squad={squad}
            />
          </motion.div>
        )}

        {activeTab === 'training' && (
          <motion.div key="training" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
            <TrainingScheduleManager
              schedule={trainingSchedule}
              onUpdate={onUpdateTrainingSchedule}
              userRole={userRole}
            />
          </motion.div>
        )}

        {activeTab === 'fixture' && (
          <motion.div key="fixture" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">

            {/* Fixture Integration — accordion, collapsed by default */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setFixtureIntegrationOpen(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fixture Integration</h3>
                {fixtureIntegrationOpen
                  ? <X className="w-4 h-4 text-slate-400" />
                  : <Plus className="w-4 h-4 text-slate-400" />}
              </button>
              {fixtureIntegrationOpen && (
                <div className="px-6 pb-6 space-y-4 border-t border-slate-100">
                  <div className="pt-4">
                    <DriblScrapePanel onFetchCompetitions={onFetchCompetitions} onFetchClubs={onFetchClubs} onFetchDribl={onFetchDribl} onConfirmSync={onConfirmSync} driblCache={driblCache} onSaveDriblCache={onSaveDriblCache} />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-300">or paste JSON</span></div>
                  </div>
                  <textarea
                    value={bulkJson}
                    onChange={(e) => setBulkJson(e.target.value)}
                    placeholder='Paste fixture JSON here...'
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-3xl text-[10px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emjsc-navy resize-none font-mono"
                  />
                  <button onClick={() => { onBulkSync(bulkJson); setBulkJson(''); }} className="w-full bg-slate-100 text-emjsc-navy text-[10px] font-black uppercase py-3.5 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-slate-200">
                    <RefreshCw className="w-4 h-4" />Sync JSON Fixtures
                  </button>
                  <button
                    onClick={() => { if (window.confirm("CRITICAL WARNING: This will PERMANENTLY DELETE the entire match schedule from the database. This cannot be undone. Proceed?")) { onClearSchedule(); } }}
                    className="w-full bg-red-100 text-emjsc-red text-[10px] font-black uppercase py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />Wipe Full Schedule
                  </button>
                </div>
              )}
            </div>

            <MatchEditor
              games={games}
              onUpdate={onManualAssign}
              onSaveGame={onSaveGame}
              onAddGame={onAddGame}
              availabilities={availabilities}
              dutiesConfig={dutiesConfig}
              onDeleteGame={onDeleteGame}
              squad={squad}
            />

          </motion.div>
        )}

        {activeTab === 'moderate' && (
          <motion.div key="moderate" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
            <AdminModeration messages={messages} blocks={blocks} onAdminDeleteMessage={onAdminDeleteMessage} onAdminDeleteBlock={onAdminDeleteBlock} />
          </motion.div>
        )}

        {activeTab === 'duties' && (
          <motion.div key="duties" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
            <div className="bg-emjsc-navy p-6 rounded-[2rem] text-white shadow-lg border-b-4 border-emjsc-red relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Duty Automation</h3>
                  <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => { if (window.confirm("ARE YOU SURE? This will automatically assign duties to all future games based on the rules. This cannot be easily undone.")) { onAutoAllocate(); } }}
                    className="w-full bg-white text-emjsc-navy font-black py-3 rounded-xl uppercase tracking-tighter text-[9px] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Smart Allocate Duties
                  </button>
                  <button
                    onClick={() => { if (window.confirm("ARE YOU SURE? This cannot be undone and will wipe ALL future assignments.")) { onClearDuties(); } }}
                    className="w-full bg-emjsc-red/20 text-white border border-white/20 font-black py-3 rounded-xl uppercase tracking-tighter text-[9px] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Wipe All Assignments
                  </button>
                </div>
              </div>
              <Zap className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12 opacity-10" />
            </div>

            <DutyManager
              duties={dutiesConfig}
              onAdd={onAddDutyConfig}
              onUpdate={onUpdateDutyConfig}
              onDelete={onDeleteDutyConfig}
              coachChild={coachChild}
              onUpdateCoachChild={onUpdateCoachChild}
              coachExemptDuties={coachExemptDuties}
              onUpdateCoachExemptDuties={onUpdateCoachExemptDuties}
              squad={squad}
            />

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Duty Distribution Tally</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Player</th>
                      {dutiesConfig.map((d: any) => (
                        <th key={d.id} className="px-2 py-4 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-center" title={d.label}>
                          {d.label.charAt(0)}
                        </th>
                      ))}
                      <th className="px-4 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {squad.map((player: any) => {
                      const counts: Record<string, number> = {};
                      dutiesConfig.forEach((d: any) => counts[d.id] = 0);
                      games.forEach((g: any) => {
                        if (g.goalie === player.name) counts.goalie = (counts.goalie || 0) + 1;
                        if (g.snackProvider === player.name) counts.snack_provider = (counts.snack_provider || 0) + 1;
                        if (g.pitchMarshal === player.name) counts.pitch_marshal = (counts.pitch_marshal || 0) + 1;
                        if (g.referee === player.name) counts.referee = (counts.referee || 0) + 1;
                        if (g.assignments) {
                          Object.entries(g.assignments).forEach(([dutyId, pName]) => {
                            if (pName === player.name) counts[dutyId] = (counts[dutyId] || 0) + 1;
                          });
                        }
                      });
                      const total = Object.values(counts).reduce((a, b) => a + b, 0);
                      return { name: player.name, counts, total };
                    })
                    .sort((a, b) => b.total - a.total)
                    .map(p => (
                      <tr key={p.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-emjsc-navy rounded-lg flex items-center justify-center text-[9px] font-bold text-white shrink-0">{p.name.charAt(0)}</div>
                            <span className="text-[10px] font-black text-emjsc-navy uppercase truncate">{p.name}</span>
                          </div>
                        </td>
                        {dutiesConfig.map((d: any) => (
                          <td key={d.id} className="px-2 py-3 text-center">
                            <span className="text-[9px] font-bold text-slate-400">{p.counts[d.id]}</span>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-[10px] font-bold text-white bg-emjsc-navy px-2 py-1 rounded-lg flex items-center justify-center w-fit ml-auto">{p.total}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap justify-center gap-4 py-4 border-t border-slate-50 italic">
                {dutiesConfig.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-1.5 opacity-50">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    <span className="text-[7px] font-black uppercase text-slate-400">{d.label.charAt(0)}: {d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'faq' && (
          <motion.div key="faq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <FaqManager
              items={faqItems}
              onAdd={onAddFaqItem}
              onUpdate={onUpdateFaqItem}
              onDelete={onDeleteFaqItem}
              onReset={onResetFaq}
            />
          </motion.div>
        )}

        {activeTab === 'features' && (
          <motion.div key="features" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  Feature Requests ({(featureRequests as any[]).length})
                </h3>
                {newFeatureCount > 0 && (
                  <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{newFeatureCount} new</span>
                )}
              </div>

              {(featureRequests as any[]).length === 0 ? (
                <p className="text-center text-[10px] font-black uppercase text-slate-400 py-8 italic">No feature requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {[...(featureRequests as any[])].sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0)).map((req: any) => (
                    <div key={req.id} className={`p-4 rounded-2xl border space-y-2 ${req.status === 'reviewed' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-black uppercase text-emjsc-navy">{req.submitterName || 'Anonymous'}</span>
                            <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${req.status === 'reviewed' ? 'bg-slate-200 text-slate-500' : 'bg-amber-500 text-white'}`}>{req.status === 'reviewed' ? 'Reviewed' : 'New'}</span>
                            {req.submittedAt && (
                              <span className="text-[8px] text-slate-400 font-bold">
                                {new Date(req.submittedAt.toDate?.() ?? req.submittedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">{req.description}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {req.status !== 'reviewed' && (
                            <button
                              onClick={() => onMarkFeatureReviewed(req.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-[8px] font-black uppercase rounded-xl active:scale-95 transition-all"
                            >
                              <Check className="w-3 h-3" />
                              Done
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteFeatureRequest(req.id)}
                            className="p-1.5 text-emjsc-red hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'squad' && (
          <motion.div key="squad" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Squad & Passwords</h3>
              <SquadManager
                squad={squad}
                onUpdate={onUpdateSquad}
                passwords={passwords}
                onUpdatePasswords={onUpdatePasswords}
                staffAccounts={staffAccounts}
                onUpdateStaff={onUpdateStaff}
                userRole={userRole}
              />
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Configurations</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Team Home Ground</label>
                  <input type="text" defaultValue={homeGround} onBlur={(e) => onUpdateHomeGround(e.target.value)} placeholder="e.g. Central Park, Malvern VIC" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy" />
                  <p className="text-[8px] text-slate-400 italic px-1 font-bold">Used for calculating travel estimates for away games.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Default Training Venue</label>
                  <input type="text" defaultValue={trainingLocation} onBlur={(e) => onUpdateTrainingLocation(e.target.value)} placeholder="e.g. Gardiner Park" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Team Logo URL</label>
                  <div className="flex items-center gap-3">
                    <img
                      src={teamLogoUrl || CLUB_LOGO}
                      alt="Team logo preview"
                      className="w-12 h-12 object-contain rounded-xl border border-slate-200 bg-slate-50 p-1 shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <input
                      type="url"
                      key={teamLogoUrl || CLUB_LOGO}
                      defaultValue={teamLogoUrl || CLUB_LOGO}
                      onBlur={(e) => onUpdateTeamLogoUrl(e.target.value.trim())}
                      className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy"
                    />
                  </div>
                  <p className="text-[8px] text-slate-400 italic px-1 font-bold">Leave as-is to keep the default, or paste a new URL to override.</p>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-50 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                    <MessageCircle className="w-3 h-3" />
                    Squad Messaging System
                  </label>
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-emjsc-navy leading-none">Internal Chat</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">{messagingEnabled ? 'Enabled for all players' : 'Globally Disabled'}</p>
                    </div>
                    <button
                      onClick={() => onUpdateMessagingEnabled(!messagingEnabled)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${messagingEnabled ? 'bg-emjsc-red text-white' : 'bg-green-600 text-white'}`}
                    >
                      {messagingEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  Feature Request Notifications
                </label>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Admin Email</label>
                    <input
                      type="email"
                      defaultValue={notificationSettings.adminEmail || 'jeremymarks@gmail.com'}
                      onBlur={(e) => onUpdateNotificationSettings({ ...notificationSettings, adminEmail: e.target.value })}
                      placeholder="jeremymarks@gmail.com"
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy"
                    />
                    <p className="text-[8px] text-slate-400 italic px-1 font-bold">Receives an email when a new feature is requested.</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <p className="text-[9px] font-black uppercase text-slate-400">EmailJS Config (optional)</p>
                    <p className="text-[8px] text-slate-400 font-medium leading-relaxed">Create a free account at emailjs.com to enable email notifications. Leave blank to skip emails.</p>
                    <input
                      type="text"
                      defaultValue={notificationSettings.emailjsServiceId || ''}
                      onBlur={(e) => onUpdateNotificationSettings({ ...notificationSettings, emailjsServiceId: e.target.value })}
                      placeholder="Service ID (e.g. service_abc123)"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none font-mono"
                    />
                    <input
                      type="text"
                      defaultValue={notificationSettings.emailjsTemplateId || ''}
                      onBlur={(e) => onUpdateNotificationSettings({ ...notificationSettings, emailjsTemplateId: e.target.value })}
                      placeholder="Template ID (e.g. template_xyz789)"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none font-mono"
                    />
                    <input
                      type="text"
                      defaultValue={notificationSettings.emailjsPublicKey || ''}
                      onBlur={(e) => onUpdateNotificationSettings({ ...notificationSettings, emailjsPublicKey: e.target.value })}
                      placeholder="Public Key"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                  <CalendarDays className="w-3 h-3" />
                  Calendar Subscription Feed
                </label>
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-emjsc-navy leading-none">Live Fixture Feed</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">
                      {calendarUpdatedAt
                        ? `Last pushed ${calendarUpdatedAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} at ${calendarUpdatedAt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} · v${calendarVersion}`
                        : 'Never manually refreshed'}
                    </p>
                  </div>
                  <button
                    onClick={onForceCalendarRefresh}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emjsc-navy hover:bg-emjsc-red text-white transition-all active:scale-95"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Push Update
                  </button>
                </div>
                <p className="text-[8px] text-slate-400 italic px-1 font-bold">Increments the feed version so calendar apps recognise new or updated events on their next sync.</p>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
