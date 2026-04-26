import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection, doc, onSnapshot, setDoc, deleteDoc,
  writeBatch, serverTimestamp, getDocs, query
} from 'firebase/firestore';
import {
  Building2, Plus, ChevronDown, ChevronRight, ExternalLink,
  Pencil, Trash2, Users, Copy, Check, RefreshCw, QrCode
} from 'lucide-react';
import { DutyManager } from '../components/DutyManager';
import type { DutyConfig } from '../lib/firebase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Club {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string;
  driblClubId: string;
  createdAt?: any;
}

interface Team {
  id: string;
  name: string;
  shortName?: string;
  season: string;
  driblTeamName: string;
  homeGround: string;
  trainingLocation: string;
  accessCode: string;
  teamLogoUrl: string;
  messagingEnabled: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Copy button ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="p-1 text-slate-500 hover:text-violet-400 transition-colors" title="Copy">
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
}

// ─── Team card ────────────────────────────────────────────────────────────────

function TeamCard({ team, clubId, onEdit, onDelete }: any) {
  const shareUrl = `${window.location.origin}${window.location.pathname}?t=${team.accessCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}`;
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm">{team.name}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">{team.season}</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => onEdit(team)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-violet-900 text-slate-400 hover:text-violet-300 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(team)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-red-400 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <code className="text-[11px] font-mono font-bold text-violet-300 bg-violet-900/30 px-2 py-1 rounded-lg tracking-wider">
          {team.accessCode}
        </code>
        <CopyButton text={shareUrl} />
        <button
          onClick={() => setShowQr(v => !v)}
          className="p-1 text-slate-500 hover:text-violet-400 transition-colors"
          title="QR Code"
        >
          <QrCode size={12} />
        </button>
        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-500 hover:text-violet-400 transition-colors" title="Open team hub">
          <ExternalLink size={12} />
        </a>
      </div>

      {showQr && (
        <div className="mt-3 flex items-center gap-3">
          <img src={qrUrl} alt="QR" className="w-20 h-20 rounded-lg" />
          <div className="text-xs text-slate-500 break-all leading-relaxed">{shareUrl}</div>
        </div>
      )}
    </div>
  );
}

// ─── Team form ────────────────────────────────────────────────────────────────

// TeamFormProps omitted — using any pattern matching existing codebase

function TeamForm({ initial, clubId, onSave, onCancel }: any) {
  const [name, setName] = useState(initial?.name || '');
  const [season, setSeason] = useState(initial?.season || new Date().getFullYear().toString());
  const [driblTeamName, setDriblTeamName] = useState(initial?.driblTeamName || '');
  const [homeGround, setHomeGround] = useState(initial?.homeGround || '');
  const [trainingLocation, setTrainingLocation] = useState(initial?.trainingLocation || '');
  const [accessCode, setAccessCode] = useState(initial?.accessCode || genCode());
  const [teamLogoUrl, setTeamLogoUrl] = useState(initial?.teamLogoUrl || '');
  const [messagingEnabled, setMessagingEnabled] = useState(initial?.messagingEnabled !== false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const id = initial?.id || slugify(name);
    await onSave({
      id,
      name: name.trim(),
      season: season.trim(),
      driblTeamName: driblTeamName.trim(),
      homeGround: homeGround.trim(),
      trainingLocation: trainingLocation.trim(),
      accessCode: accessCode.trim(),
      teamLogoUrl: teamLogoUrl.trim(),
      messagingEnabled,
    });
    setSaving(false);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-black text-white">{initial?.id ? 'Edit Team' : 'New Team'}</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Team Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. U8 Saturday White"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Season</label>
          <input value={season} onChange={e => setSeason(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Access Code</label>
          <div className="flex gap-1.5">
            <input value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-violet-300 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-violet-500 uppercase" />
            <button onClick={() => setAccessCode(genCode())} className="px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-violet-400 transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Dribl Team Name (for fixture matching)</label>
          <input value={driblTeamName} onChange={e => setDriblTeamName(e.target.value)}
            placeholder="e.g. EMJSC U8 Saturday White"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Home Ground</label>
          <input value={homeGround} onChange={e => setHomeGround(e.target.value)}
            placeholder="e.g. Central Park, Malvern VIC"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Training Location</label>
          <input value={trainingLocation} onChange={e => setTrainingLocation(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Team Logo URL</label>
          <input value={teamLogoUrl} onChange={e => setTeamLogoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="msgEnabled" checked={messagingEnabled} onChange={e => setMessagingEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 text-violet-600 focus:ring-violet-500" />
          <label htmlFor="msgEnabled" className="text-sm text-slate-300 font-medium cursor-pointer">Enable messaging for this team</label>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={save} disabled={saving || !name.trim()}
          className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black text-sm rounded-xl transition-colors">
          {saving ? 'Saving...' : 'Save Team'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm rounded-xl transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Club panel ───────────────────────────────────────────────────────────────

function ClubPanel({ club, onUpdate }: any) {
  const [expanded, setExpanded] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const unsub = onSnapshot(collection(db, `clubs/${club.id}/teams`), snap => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    });
    return () => unsub();
  }, [club.id, expanded]);

  const saveTeam = async (team: Team) => {
    const teamPath = `clubs/${club.id}/teams/${team.id}`;
    const { id: _id, ...teamData } = team;
    await setDoc(doc(db, teamPath), teamData);
    // Create the accessCodes lookup entry
    await setDoc(doc(db, 'accessCodes', team.accessCode), {
      clubId: club.id,
      teamId: team.id,
    });
    setShowAddTeam(false);
    setEditingTeam(null);
  };

  const deleteTeam = async (team: Team) => {
    if (!confirm(`Delete team "${team.name}"? This will not delete existing game/player data.`)) return;
    await deleteDoc(doc(db, `clubs/${club.id}/teams/${team.id}`));
    await deleteDoc(doc(db, 'accessCodes', team.accessCode));
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
      {/* Club header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 p-4 hover:bg-slate-800 transition-colors text-left"
      >
        {club.logoUrl ? (
          <img src={club.logoUrl} alt={club.name} className="w-10 h-10 rounded-xl object-contain bg-white p-0.5" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
            <Building2 size={20} className="text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm">{club.name}</p>
          <p className="text-[10px] text-slate-500 font-bold">{club.shortName}</p>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <span className="text-xs font-bold">{teams.length || ''}</span>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {/* Teams list */}
      {expanded && (
        <div className="border-t border-slate-700 p-4 space-y-3">
          {teams.map(team => (
            editingTeam?.id === team.id ? (
              <TeamForm
                key={team.id}
                initial={team}
                clubId={club.id}
                onSave={saveTeam}
                onCancel={() => setEditingTeam(null)}
              />
            ) : (
              <TeamCard
                key={team.id}
                team={team}
                clubId={club.id}
                onEdit={setEditingTeam}
                onDelete={deleteTeam}
              />
            )
          ))}

          {showAddTeam ? (
            <TeamForm clubId={club.id} onSave={saveTeam} onCancel={() => setShowAddTeam(false)} />
          ) : (
            <button
              onClick={() => setShowAddTeam(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-slate-700 hover:border-violet-600 hover:text-violet-400 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-colors"
            >
              <Plus size={14} />
              Add Team
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Club form ────────────────────────────────────────────────────────────────

function ClubForm({ initial, onSave, onCancel }: any) {
  const [name, setName] = useState(initial?.name || '');
  const [shortName, setShortName] = useState(initial?.shortName || '');
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl || '');
  const [driblClubId, setDriblClubId] = useState(initial?.driblClubId || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const id = initial?.id || slugify(name);
    await onSave({ id, name: name.trim(), shortName: shortName.trim(), logoUrl: logoUrl.trim(), driblClubId: driblClubId.trim() });
    setSaving(false);
  };

  return (
    <div className="bg-slate-800 border border-violet-700/50 rounded-2xl p-5 space-y-3">
      <h3 className="text-sm font-black text-white">{initial?.id ? 'Edit Club' : 'New Club'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Club Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. East Malvern Junior Soccer Club"
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Short Name</label>
          <input value={shortName} onChange={e => setShortName(e.target.value.toUpperCase())}
            placeholder="EMJSC"
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500 uppercase" />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Logo URL</label>
          <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Dribl Club ID (for FV fixture sync)</label>
          <input value={driblClubId} onChange={e => setDriblClubId(e.target.value)}
            placeholder="e.g. east-malvern"
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !name.trim()}
          className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black text-sm rounded-xl transition-colors">
          {saving ? 'Saving...' : 'Save Club'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm rounded-xl transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SuperAdminClubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [showAddClub, setShowAddClub] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clubs'), snap => {
      const c = snap.docs.map(d => ({ id: d.id, ...d.data() } as Club));
      setClubs(c);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const saveClub = async (club: Club) => {
    const { id, ...data } = club;
    await setDoc(doc(db, 'clubs', id), { ...data, createdAt: serverTimestamp() });
    setShowAddClub(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-black text-white">Clubs</h2>
        <button
          onClick={() => setShowAddClub(v => !v)}
          className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl transition-colors"
        >
          <Plus size={14} />
          New Club
        </button>
      </div>

      {showAddClub && (
        <div className="mb-4">
          <ClubForm onSave={saveClub} onCancel={() => setShowAddClub(false)} />
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : clubs.length === 0 && !showAddClub ? (
        <div className="text-center py-16 text-slate-600">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold mb-2">No clubs yet</p>
          <button onClick={() => setShowAddClub(true)} className="text-xs font-black text-violet-400 hover:text-violet-300">
            Create your first club →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {clubs.map(club => (
            <ClubPanel key={club.id} club={club} onUpdate={saveClub} />
          ))}
        </div>
      )}
    </div>
  );
}
