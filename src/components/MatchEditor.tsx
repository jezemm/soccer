import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Users, RefreshCw } from 'lucide-react';
export function MatchEditor({ games, onUpdate, onSaveGame, onAddGame, availabilities = [], dutiesConfig = [], onDeleteGame, squad = [] }: any) {
  const [selectedGameId, setSelectedGameId] = useState(games[0]?.id || '');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [opponent, setOpponent] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOpponent, setNewOpponent] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [newIsHome, setNewIsHome] = useState(true);
  const [addStatus, setAddStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGameId && games.length > 0) {
      setSelectedGameId(games[0].id);
    }
  }, [games, selectedGameId]);

  const selectedGame = games.find((g: any) => g.id === selectedGameId);
  const dateKey = selectedGame?.date?.split('T')[0];
  const matchAvailabilities = availabilities.filter((a: any) => a.dateKey === dateKey && a.isUnavailable);

  useEffect(() => {
    if (selectedGame) {
      setVenue(selectedGame.location || '');
      setDate(selectedGame.date || '');
      setOpponent(selectedGame.opponent || '');
      setIsHome(selectedGame.isHome ?? true);
    }
  }, [selectedGameId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!selectedGameId) return;
    setStatus('Saving...');
    try {
      await onSaveGame(selectedGameId, {
        location: venue,
        date: date,
        opponent: opponent,
        isHome: isHome,
      });
      setStatus('Saved!');
    } catch (e: any) {
      setStatus(`Failed: ${e?.code || e?.message || 'error'}`);
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove the match vs ${opponent}?`)) {
      onDeleteGame(selectedGameId);
      setSelectedGameId(games.find((g: any) => g.id !== selectedGameId)?.id || '');
    }
  };

  const handleAdd = async () => {
    if (!newOpponent.trim() || !newDate || !newVenue.trim()) {
      setAddStatus('Fill in all fields');
      setTimeout(() => setAddStatus(null), 3000);
      return;
    }
    setAddStatus('Adding...');
    try {
      await onAddGame(newOpponent.trim(), newDate, newVenue.trim(), newIsHome);
      setAddStatus('Added!');
      setNewOpponent(''); setNewDate(''); setNewVenue(''); setNewIsHome(true);
      setShowAddForm(false);
    } catch (e: any) {
      setAddStatus(`Failed: ${e?.code || e?.message || 'error'}`);
    }
    setTimeout(() => setAddStatus(null), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Add Match</h3>
          <div className="flex items-center gap-2">
            {addStatus && <span className="text-[9px] font-black uppercase text-emjsc-red animate-pulse">{addStatus}</span>}
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emjsc-navy text-white text-[9px] font-black uppercase rounded-xl active:scale-95 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {showAddForm ? 'Cancel' : 'New Match'}
            </button>
          </div>
        </div>
        {showAddForm && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Opponent</label>
                <input type="text" value={newOpponent} onChange={(e) => setNewOpponent(e.target.value)} placeholder="Team Name" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Home / Away</label>
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  <button onClick={() => setNewIsHome(true)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${newIsHome ? 'bg-white text-emjsc-navy shadow-sm' : 'text-slate-400'}`}>Home</button>
                  <button onClick={() => setNewIsHome(false)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${!newIsHome ? 'bg-white text-emjsc-navy shadow-sm' : 'text-slate-400'}`}>Away</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Venue / Location</label>
                <input type="text" value={newVenue} onChange={(e) => setNewVenue(e.target.value)} placeholder="Ground name or address" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date & Kick-off Time</label>
                <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none" />
              </div>
            </div>
            <button onClick={handleAdd} className="w-full bg-emjsc-red text-white text-[10px] font-black uppercase py-3 rounded-2xl shadow-sm active:scale-[0.98] transition-all">
              Add Match to Schedule
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 shrink-0">Match Detail Editor</h3>
          <div className="flex items-center gap-2 min-w-0">
            {status && <span className="text-[9px] font-black uppercase text-emjsc-red animate-pulse truncate">{status}</span>}
            <button
              onClick={handleDelete}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-emjsc-red text-[9px] font-black uppercase rounded-xl border border-red-100 hover:bg-red-100 transition-colors active:scale-95"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Select Match</label>
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none"
            >
              {games.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {new Date(g.date).toLocaleDateString()} vs {g.opponent}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Opponent</label>
              <input type="text" value={opponent} onChange={(e) => setOpponent(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Home / Away</label>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button onClick={() => setIsHome(true)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${isHome ? 'bg-white text-emjsc-navy shadow-sm' : 'text-slate-400'}`}>Home</button>
                <button onClick={() => setIsHome(false)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${!isHome ? 'bg-white text-emjsc-navy shadow-sm' : 'text-slate-400'}`}>Away</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Venue / Location</label>
              <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date & Arrival Time</label>
              <input type="datetime-local" value={date ? date.substring(0, 16) : ''} onChange={(e) => setDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manual Duty Assignments</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {dutiesConfig.map((duty: any) => {
                const isApplicable = duty.applicableTo === 'both' || (duty.applicableTo === 'home' && isHome) || (duty.applicableTo === 'away' && !isHome) || !duty.applicableTo;
                if (!isApplicable) return null;

                const assignee = (selectedGame?.assignments && selectedGame.assignments[duty.id]) || (duty.id === 'goalie' ? selectedGame?.goalie : duty.id === 'snack_provider' ? selectedGame?.snackProvider : duty.id === 'pitch_marshal' ? selectedGame?.pitchMarshal : duty.id === 'referee' ? selectedGame?.referee : "");

                return (
                  <div key={duty.id} className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-500 flex items-center justify-between">
                      {duty.label}
                      {selectedGame?.swapRequests?.[duty.id] && <span className="bg-orange-100 text-orange-600 px-1 rounded-sm animate-pulse">Swap Req</span>}
                    </label>
                    <select
                      value={assignee || ""}
                      onChange={(e) => onUpdate(selectedGameId, duty.id, e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none"
                    >
                      <option value="">(Empty)</option>
                      {squad.map((p: any) => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {matchAvailabilities.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-emjsc-red mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Unavailable Players for this date ({matchAvailabilities.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {matchAvailabilities.map((a: any) => (
                  <div key={a.playerName} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 rounded-full">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">{a.playerName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full bg-emjsc-navy text-white text-[10px] font-black uppercase py-4 rounded-2xl shadow-xl shadow-blue-900/10 active:scale-[0.98] transition-all"
          >
            Update Match Details
          </button>
        </div>
      </div>
    </div>
  );
}
