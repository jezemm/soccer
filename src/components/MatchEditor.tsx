import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react';

function getNextGameId(games: any[]): string {
  const now = new Date();
  const upcoming = [...games]
    .filter((g: any) => new Date(g.date) >= now)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming[0]?.id || games[0]?.id || '';
}

function GameRowEditor({ game, isOpen, onToggle, onSaveGame, onUpdate, onDeleteGame, availabilities, dutiesConfig, squad }: any) {
  const [venue, setVenue] = useState(game.location || '');
  const [date, setDate] = useState(game.date || '');
  const [opponent, setOpponent] = useState(game.opponent || '');
  const [opponentLogo, setOpponentLogo] = useState(game.opponentLogo || '');
  const [isHome, setIsHome] = useState(game.isHome ?? true);
  const [status, setStatus] = useState<string | null>(null);

  // Sync local state when game prop changes
  useEffect(() => {
    setVenue(game.location || '');
    setDate(game.date || '');
    setOpponent(game.opponent || '');
    setOpponentLogo(game.opponentLogo || '');
    setIsHome(game.isHome ?? true);
  }, [game.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setStatus('Saving…');
    try {
      await onSaveGame(game.id, {
        location: venue,
        date,
        opponent,
        opponentLogo: opponentLogo.trim() || null,
        isHome,
      });
      setStatus('Saved!');
    } catch (e: any) {
      setStatus(`Failed: ${e?.code || e?.message || 'error'}`);
    }
    setTimeout(() => setStatus(null), 2500);
  };

  const handleDelete = () => {
    if (window.confirm(`Remove match vs ${opponent}?`)) onDeleteGame(game.id);
  };

  const dateKey = game.date?.split('T')[0];
  const matchAvailabilities = availabilities.filter((a: any) => a.dateKey === dateKey && a.isUnavailable);
  const dateObj = new Date(game.date);
  const dateStr = dateObj.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = dateObj.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  const isPast = dateObj < new Date();

  const applicableDuties = (dutiesConfig as any[]).filter((d: any) => {
    if (!d.applicableTo || d.applicableTo === 'both') return true;
    if (d.applicableTo === 'home' && isHome) return true;
    if (d.applicableTo === 'away' && !isHome) return true;
    return false;
  });

  return (
    <div className={`border-b border-slate-100 last:border-b-0 ${isPast ? 'opacity-60' : ''}`}>
      {/* Compact row */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors ${isOpen ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${game.isHome ? 'bg-emjsc-navy/10 text-emjsc-navy border-emjsc-navy/20' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {game.isHome ? 'H' : 'A'}
          </span>
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black text-emjsc-navy uppercase shrink-0">{dateStr}</span>
          <span className="text-[9px] font-bold text-slate-400 shrink-0">{timeStr}</span>
          <span className="text-[10px] font-bold text-slate-700 truncate">vs {game.opponent?.replace(/ - .*/, '') || 'TBC'}</span>
          {game.location && (
            <span className="text-[9px] text-slate-400 truncate hidden sm:inline">{game.location.split(/[,\-]/)[0].trim()}</span>
          )}
        </div>
        {game.opponentLogo && (
          <img src={game.opponentLogo} alt="" className="w-5 h-5 object-contain rounded shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
      </button>

      {/* Inline editor */}
      {isOpen && (
        <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-3">
          {/* Row 1: opponent + home/away */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-400 ml-0.5">Opponent</label>
              <input type="text" value={opponent} onChange={e => setOpponent(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-400 ml-0.5">H / A</label>
              <div className="flex p-0.5 bg-slate-200 rounded-xl h-[34px]">
                <button onClick={() => setIsHome(true)} className={`flex-1 text-[9px] font-black uppercase rounded-lg transition-all ${isHome ? 'bg-white text-emjsc-navy shadow-sm' : 'text-slate-500'}`}>Home</button>
                <button onClick={() => setIsHome(false)} className={`flex-1 text-[9px] font-black uppercase rounded-lg transition-all ${!isHome ? 'bg-white text-emjsc-navy shadow-sm' : 'text-slate-500'}`}>Away</button>
              </div>
            </div>
          </div>

          {/* Row 2: venue + date */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-400 ml-0.5">Venue</label>
              <input type="text" value={venue} onChange={e => setVenue(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-400 ml-0.5">Date & Time</label>
              <input type="datetime-local" value={date ? date.substring(0, 16) : ''} onChange={e => setDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy" />
            </div>
          </div>

          {/* Row 3: opponent logo */}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-400 ml-0.5">Opposition Logo URL</label>
            <div className="flex items-center gap-2">
              {opponentLogo ? (
                <img src={opponentLogo} alt="" className="w-8 h-8 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-8 h-8 rounded-lg border border-dashed border-slate-200 bg-white shrink-0" />
              )}
              <input type="url" value={opponentLogo} onChange={e => setOpponentLogo(e.target.value)}
                placeholder="https://…/logo.png"
                className="flex-1 p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy" />
            </div>
          </div>

          {/* Duties */}
          {applicableDuties.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[8px] font-black uppercase text-slate-400">Duty Assignments</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {applicableDuties.map((duty: any) => {
                  const assignee = (game.assignments && game.assignments[duty.id]) || (duty.id === 'goalie' ? game.goalie : duty.id === 'snack_provider' ? game.snackProvider : duty.id === 'pitch_marshal' ? game.pitchMarshal : duty.id === 'referee' ? game.referee : '');
                  return (
                    <div key={duty.id} className="flex flex-col gap-0.5">
                      <label className="text-[8px] font-black uppercase text-slate-400 flex items-center justify-between">
                        {duty.label}
                        {game.swapRequests?.[duty.id] && <span className="bg-orange-100 text-orange-600 px-1 rounded text-[7px] animate-pulse">Swap</span>}
                      </label>
                      <select value={assignee || ''} onChange={e => onUpdate(game.id, duty.id, e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-emjsc-navy outline-none">
                        <option value="">(Empty)</option>
                        {squad.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unavailable */}
          {matchAvailabilities.length > 0 && (
            <div className="pt-1">
              <p className="text-[8px] font-black uppercase text-emjsc-red mb-1.5 flex items-center gap-1">
                <Users className="w-3 h-3" />Unavailable ({matchAvailabilities.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matchAvailabilities.map((a: any) => (
                  <span key={a.playerName} className="text-[9px] font-bold text-slate-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">{a.playerName}</span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-emjsc-red text-[9px] font-black uppercase rounded-xl border border-red-100 hover:bg-red-100 transition-colors active:scale-95">
              <Trash2 className="w-3 h-3" />Delete
            </button>
            <button onClick={handleSave}
              className="flex-1 bg-emjsc-navy text-white text-[9px] font-black uppercase py-2 rounded-xl shadow active:scale-[0.98] transition-all">
              {status || 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MatchEditor({ games, onUpdate, onSaveGame, onAddGame, availabilities = [], dutiesConfig = [], onDeleteGame, squad = [] }: any) {
  const [openGameIds, setOpenGameIds] = useState<Set<string>>(() => {
    const next = getNextGameId(games);
    return next ? new Set([next]) : new Set();
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOpponent, setNewOpponent] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [newIsHome, setNewIsHome] = useState(true);
  const [addStatus, setAddStatus] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newOpponent.trim() || !newDate || !newVenue.trim()) {
      setAddStatus('Fill in all fields');
      setTimeout(() => setAddStatus(null), 3000);
      return;
    }
    setAddStatus('Adding…');
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

  const now = new Date();
  const upcoming = [...games].filter((g: any) => new Date(g.date) >= now).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const completed = [...games].filter((g: any) => new Date(g.date) < now).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const allIds = games.map((g: any) => g.id);
  const allOpen = allIds.length > 0 && allIds.every((id: string) => openGameIds.has(id));

  const toggleGame = (id: string) =>
    setOpenGameIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Match Schedule <span className="text-emjsc-navy ml-1">{games.length}</span>
          </h3>
          {games.length > 0 && (
            <button
              onClick={() => setOpenGameIds(allOpen ? new Set() : new Set(allIds))}
              className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-emjsc-navy transition-colors"
            >
              {allOpen ? 'Collapse All' : 'Expand All'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {addStatus && <span className="text-[9px] font-black uppercase text-emjsc-red animate-pulse">{addStatus}</span>}
          <button onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emjsc-navy text-white text-[9px] font-black uppercase rounded-xl active:scale-95 transition-all">
            <PlusCircle className="w-3.5 h-3.5" />
            {showAddForm ? 'Cancel' : 'New Match'}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="px-4 py-3 bg-green-50 border-b border-green-100 space-y-2">
          <p className="text-[8px] font-black uppercase text-green-700 tracking-widest">New Match</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-400">Opponent</label>
              <input type="text" value={newOpponent} onChange={e => setNewOpponent(e.target.value)} placeholder="Team name"
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-400">H / A</label>
              <div className="flex p-0.5 bg-slate-200 rounded-xl h-[34px]">
                <button onClick={() => setNewIsHome(true)} className={`flex-1 text-[9px] font-black uppercase rounded-lg transition-all ${newIsHome ? 'bg-white text-emjsc-navy shadow-sm' : 'text-slate-500'}`}>Home</button>
                <button onClick={() => setNewIsHome(false)} className={`flex-1 text-[9px] font-black uppercase rounded-lg transition-all ${!newIsHome ? 'bg-white text-emjsc-navy shadow-sm' : 'text-slate-500'}`}>Away</button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-400">Venue</label>
              <input type="text" value={newVenue} onChange={e => setNewVenue(e.target.value)} placeholder="Ground name"
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-400">Date & Time</label>
              <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none" />
            </div>
          </div>
          <button onClick={handleAdd} className="w-full bg-green-600 text-white text-[9px] font-black uppercase py-2.5 rounded-xl active:scale-[0.98] transition-all">
            Add Match to Schedule
          </button>
        </div>
      )}

      {/* Game list */}
      {games.length === 0 ? (
        <p className="text-center text-[10px] font-black uppercase text-slate-300 py-8 italic">No matches scheduled</p>
      ) : (
        <div>
          {upcoming.length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Upcoming — {upcoming.length}</span>
              </div>
              {upcoming.map(game => (
                <GameRowEditor
                  key={game.id}
                  game={game}
                  isOpen={openGameIds.has(game.id)}
                  onToggle={() => toggleGame(game.id)}
                  onSaveGame={onSaveGame}
                  onUpdate={onUpdate}
                  onDeleteGame={onDeleteGame}
                  availabilities={availabilities}
                  dutiesConfig={dutiesConfig}
                  squad={squad}
                />
              ))}
            </>
          )}
          {completed.length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-slate-50 border-y border-slate-100">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Completed — {completed.length}</span>
              </div>
              {completed.map(game => (
                <GameRowEditor
                  key={game.id}
                  game={game}
                  isOpen={openGameIds.has(game.id)}
                  onToggle={() => toggleGame(game.id)}
                  onSaveGame={onSaveGame}
                  onUpdate={onUpdate}
                  onDeleteGame={onDeleteGame}
                  availabilities={availabilities}
                  dutiesConfig={dutiesConfig}
                  squad={squad}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
