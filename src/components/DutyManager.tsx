import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { TEAM_SQUAD } from '../lib/constants';

export function DutyManager({
  duties = [],
  onAdd,
  onUpdate,
  onDelete,
  coachChild,
  onUpdateCoachChild,
  coachExemptDuties = [],
  onUpdateCoachExemptDuties
}: any) {
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'player' | 'parent'>('player');
  const [newApplicability, setNewApplicability] = useState<'home' | 'away' | 'both'>('both');
  const [newEmoji, setNewEmoji] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editType, setEditType] = useState<'player' | 'parent'>('player');
  const [editApplicability, setEditApplicability] = useState<'home' | 'away' | 'both'>('both');
  const [editEmoji, setEditEmoji] = useState('');

  const [localDuties, setLocalDuties] = useState<any[]>(duties);
  useEffect(() => { setLocalDuties(duties); }, [duties]);

  const DUTY_EMOJIS = ['⚽','🧤','🍊','🥤','🚩','📋','👮','🎽','🏃','🥅','📣','🏆','⭐','💪','🎯','🏅','🍕','🫐','🧃','🎪'];

  const startEdit = (d: any) => {
    setEditingId(d.id);
    setEditLabel(d.label);
    setEditType(d.type);
    setEditApplicability(d.applicableTo || 'both');
    setEditEmoji(d.emoji || '');
  };

  const saveEdit = (d: any) => {
    const updated: any = { ...d, label: editLabel, type: editType, applicableTo: editApplicability };
    if (editEmoji) updated.emoji = editEmoji;
    else delete updated.emoji;
    setLocalDuties(prev => prev.map(i => i.id === updated.id ? updated : i));
    onUpdate(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setLocalDuties(prev => prev.filter(i => i.id !== id));
    onDelete(id);
  };

  const cancelEdit = () => setEditingId(null);

  const defaultDuties = [
    { id: 'goalie', label: 'Goalie (1st Half)', type: 'player', maxPerWeek: 1, maxPerType: 1, applicableTo: 'both' },
    { id: 'goalie_2', label: 'Goalie (2nd Half)', type: 'player', maxPerWeek: 1, maxPerType: 1, applicableTo: 'both' },
    { id: 'snack_provider', label: 'Match Day Snacks', type: 'parent', maxPerWeek: 1, maxPerType: 1, applicableTo: 'both' },
    { id: 'referee', label: 'Referee', type: 'parent', maxPerWeek: 1, maxPerType: 1, applicableTo: 'home' },
    { id: 'pitch_marshal', label: 'Pitch Marshall', type: 'parent', maxPerWeek: 1, maxPerType: 1, applicableTo: 'home' },
  ];

  const handleAddDefault = () => {
    defaultDuties.forEach(d => {
      if (!localDuties.some((existing: any) => existing.id === d.id)) {
        onAdd(d as any);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Team Duty Settings</h3>
          <button
            onClick={handleAddDefault}
            className="text-[8px] font-black uppercase tracking-widest text-emjsc-navy bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors"
          >
            Create Default Duties
          </button>
        </div>

        <div className="space-y-3">
          {localDuties?.map((d: any) => {
            const isEditing = editingId === d.id;
            return isEditing ? (
              <div key={d.id} className="p-4 bg-emjsc-navy/5 rounded-2xl border border-emjsc-navy/20 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Name</label>
                    <input
                      autoFocus
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(d); if (e.key === 'Escape') cancelEdit(); }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Type</label>
                    <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-emjsc-navy outline-none" value={editType} onChange={(e) => setEditType(e.target.value as any)}>
                      <option value="player">Player</option>
                      <option value="parent">Parent</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Applies To</label>
                    <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-emjsc-navy outline-none" value={editApplicability} onChange={(e) => setEditApplicability(e.target.value as any)}>
                      <option value="both">Both</option>
                      <option value="home">Home Only</option>
                      <option value="away">Away Only</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Icon (Emoji)</label>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shrink-0">
                      {editEmoji || <span className="text-slate-300 text-xs">?</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {DUTY_EMOJIS.map(e => (
                        <button key={e} onClick={() => setEditEmoji(editEmoji === e ? '' : e)} className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all ${editEmoji === e ? 'bg-emjsc-navy/10 ring-2 ring-emjsc-navy scale-110' : 'bg-white border border-slate-200 hover:border-slate-400'}`}>{e}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(d)} className="flex-1 bg-emjsc-navy text-white text-[9px] font-black uppercase py-2 rounded-xl active:scale-95 transition-all">Save</button>
                  <button onClick={cancelEdit} className="px-4 bg-slate-100 text-slate-500 text-[9px] font-black uppercase py-2 rounded-xl active:scale-95 transition-all">Cancel</button>
                </div>
              </div>
            ) : (
              <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                {d.emoji && <span className="text-xl shrink-0">{d.emoji}</span>}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-emjsc-navy truncate">{d.label}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    {d.type} · {d.applicableTo === 'both' ? 'All Games' : d.applicableTo === 'home' ? 'Home Only' : 'Away Only'}
                  </p>
                </div>
                <button onClick={() => startEdit(d)} className="p-2 text-emjsc-navy hover:bg-emjsc-navy/10 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={() => handleDelete(d.id)} className="p-2 text-emjsc-red hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap gap-2">
            <input placeholder="New Duty Name (e.g. Oranges)" className="flex-1 min-w-[150px] p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase text-emjsc-navy" value={newType} onChange={(e) => setNewType(e.target.value as any)}>
              <option value="player">Player</option>
              <option value="parent">Parent</option>
            </select>
            <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase text-emjsc-navy" value={newApplicability} onChange={(e) => setNewApplicability(e.target.value as any)}>
              <option value="both">Both Games</option>
              <option value="home">Home Only</option>
              <option value="away">Away Only</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-lg shrink-0">
              {newEmoji || <span className="text-slate-300 text-xs">?</span>}
            </div>
            <div className="flex flex-wrap gap-1 flex-1">
              {DUTY_EMOJIS.map(e => (
                <button key={e} onClick={() => setNewEmoji(newEmoji === e ? '' : e)} className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all ${newEmoji === e ? 'bg-emjsc-navy/10 ring-2 ring-emjsc-navy scale-110' : 'bg-white border border-slate-200 hover:border-slate-400'}`}>{e}</button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              if (!newLabel.trim()) return;
              onAdd({ id: newLabel.toLowerCase().replace(/\s+/g, '_'), label: newLabel, emoji: newEmoji || undefined, type: newType, maxPerWeek: 1, maxPerType: 1, applicableTo: newApplicability });
              setNewLabel(''); setNewEmoji('');
            }}
            className="w-full bg-emjsc-navy text-white py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform text-[10px] font-black uppercase"
          >
            <Plus className="w-4 h-4" />
            Add Duty
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Coach's Child Duty Exemption</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Select Coach's Child</label>
              <select
                value={coachChild || ""}
                onChange={(e) => onUpdateCoachChild(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy"
              >
                <option value="">None Selected</option>
                {TEAM_SQUAD.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              <p className="text-[8px] text-slate-400 italic px-1 font-bold">This player will be excluded from the duties selected on the right.</p>
            </div>
          </div>

          <div className="space-y-4">
            {coachChild ? (
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <p className="text-[10px] font-black uppercase text-emjsc-navy tracking-wider text-center">Exempt {coachChild} from:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {localDuties.map((d: any) => (
                    <label key={d.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer group hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={coachExemptDuties.includes(d.id)}
                        onChange={(e) => {
                          const newDuties = e.target.checked
                            ? [...coachExemptDuties, d.id]
                            : coachExemptDuties.filter((id: string) => id !== d.id);
                          onUpdateCoachExemptDuties(newDuties);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-emjsc-navy focus:ring-emjsc-navy"
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase group-hover:text-emjsc-navy truncate">{d.label}</span>
                    </label>
                  ))}
                  {duties.length === 0 && <p className="col-span-2 text-[9px] text-center text-slate-400 uppercase font-black py-4">No duties configured yet.</p>}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center italic">Select a child first to set exemptions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
