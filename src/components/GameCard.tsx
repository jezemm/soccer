import React from 'react';
import { motion } from 'motion/react';
import { MapPin, ArrowLeftRight, Zap, Users } from 'lucide-react';
import { splitOpponent } from '../lib/constants';

export function GameCard({ game, onClick, userName, homeGround, feedbacks = [], availabilities = [], dutiesConfig = [], onSignUp, onToggleAvailability, isSyncing, dimmed = false }: any) {
  const date = new Date(game.date);
  const dateKey = game.date.split('T')[0];
  const isUnavailable = availabilities.some((a: any) => a.playerName === userName && a.dateKey === dateKey && a.isUnavailable);
  const totalUnavailable = availabilities.filter((a: any) => a.dateKey === dateKey && a.isUnavailable).length;
  const arrivalTime = new Date(date.getTime() - 30 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const applicableDuties = (dutiesConfig.length > 0 ? dutiesConfig : [
    { id: 'goalie', label: 'Goalie' },
    { id: 'snack_provider', label: 'Snack' },
    { id: 'pitch_marshal', label: 'Marshal' },
    { id: 'referee', label: 'Referee' }
  ]).filter((d: any) => {
    if (d.applicableTo === 'both') return true;
    if (d.applicableTo === 'home' && game.isHome) return true;
    if (d.applicableTo === 'away' && !game.isHome) return true;
    if (!d.applicableTo) return true;
    return false;
  });

  const getAssignee = (d: any) => (game.assignments && game.assignments[d.id]) ||
    (d.id === 'goalie' ? game.goalie : d.id === 'snack_provider' ? game.snackProvider : d.id === 'pitch_marshal' ? game.pitchMarshal : d.id === 'referee' ? game.referee : null);
  const getSwap = (d: any) => (game.swapRequests && game.swapRequests[d.id]) ||
    (d.id === 'goalie' ? game.goalieSwapRequested : d.id === 'snack_provider' ? game.snackSwapRequested : d.id === 'pitch_marshal' ? game.marshalSwapRequested : d.id === 'referee' ? game.refereeSwapRequested : false);

  const isMissingDuties = applicableDuties.some((d: any) => !getAssignee(d));
  const isSwapPending = applicableDuties.some((d: any) => getSwap(d));

  return (
    <motion.div
      whileTap={dimmed ? undefined : { scale: 0.98 }}
      onClick={dimmed ? undefined : onClick}
      className={`bg-white p-4 rounded-[1.75rem] shadow-sm border flex flex-col transition-all gap-3 ${
        dimmed ? 'opacity-50 grayscale cursor-default' : `cursor-pointer ${isSwapPending ? 'border-orange-300 bg-orange-50/30' : isMissingDuties ? 'border-amber-200' : 'border-slate-200 hover:border-emjsc-navy'}`
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {date.toLocaleString('default', { month: 'short' })} {date.getDate()} • {game.isHome ? 'Home' : 'Away'}
            </p>
            {!game.isHome && game.travelTimeMinutes && (
              <div className="flex items-center gap-0.5 text-[8px] font-black text-emjsc-red uppercase bg-red-50/50 px-1.5 py-0.5 rounded border border-red-100/50">
                <Zap className="w-2.5 h-2.5" />
                {game.travelTimeMinutes}m
              </div>
            )}
            {totalUnavailable > 0 && (
              <div className="flex items-center gap-0.5 text-[8px] font-black text-slate-500 uppercase bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                <Users className="w-2.5 h-2.5" />
                {totalUnavailable} Out
              </div>
            )}
          </div>
          <div className="leading-tight">
            {(() => { const { club, team } = splitOpponent(game.opponent); return <><p className="text-lg font-black text-emjsc-navy uppercase italic truncate">Vs {team}</p>{club && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{club}</p>}</>; })()}
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(game.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 group/loc w-fit"
          >
            <MapPin className="w-3 h-3 text-emjsc-red shrink-0" />
            <p className="text-[9px] text-slate-500 font-bold uppercase truncate tracking-tight group-hover/loc:text-emjsc-red transition-colors">{game.location}</p>
          </a>
          {onToggleAvailability && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleAvailability(userName, dateKey); }}
              className="flex items-center gap-1.5 active:scale-95 transition-all mt-2.5"
            >
              <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${isUnavailable ? 'bg-red-400' : 'bg-green-400'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${isUnavailable ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className={`text-[9px] font-black uppercase ${isUnavailable ? 'text-red-600' : 'text-green-700'}`}>
                {isUnavailable ? 'Unavailable to Play' : 'Available to Play'}
              </span>
            </button>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex flex-col items-end gap-0">
            <p className="text-[9px] text-emjsc-navy font-black leading-none uppercase tracking-tighter">ARRIVE {arrivalTime}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">KO {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>

      {onSignUp && applicableDuties.length > 0 && (
        <div className="border-t border-slate-100 pt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Duties</span>
            <div className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${
              isSwapPending ? 'bg-orange-50 text-orange-600 border-orange-100' : isMissingDuties ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'
            }`}>
              {isSwapPending ? 'Swap Needed' : isMissingDuties ? 'Help Wanted' : 'Ready'}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {applicableDuties.map((duty: any) => {
              const assignee = getAssignee(duty);
              const swap = getSwap(duty);
              const isMe = assignee === userName;
              const syncing = isSyncing === `${game.id}-${duty.id}`;
              const takenByOther = !isMe && !!assignee && !swap;
              const blocked = !isMe && (takenByOther || isUnavailable);
              return (
                <button
                  key={duty.id}
                  onClick={() => onSignUp(game.id, duty.id)}
                  disabled={syncing || blocked}
                  className={`px-2.5 py-1.5 rounded-lg border transition-all ${
                    isMe
                      ? swap ? 'bg-orange-50 border-orange-300 hover:bg-orange-100 active:scale-95' : 'bg-red-50 border-emjsc-red hover:bg-red-100 active:scale-95'
                      : swap
                        ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-300'
                        : takenByOther
                          ? 'bg-white border-slate-200 cursor-not-allowed'
                          : isUnavailable
                            ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                            : 'bg-white border-slate-200 hover:border-emjsc-navy active:scale-95'
                  } ${syncing ? 'opacity-70 cursor-wait' : ''}`}
                >
                  <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0 truncate">{duty.emoji && <span className="mr-0.5">{duty.emoji}</span>}{duty.label}</p>
                  <p className={`text-[9px] font-black uppercase truncate ${
                    isMe ? (swap ? 'text-orange-600' : 'text-emjsc-red')
                      : swap ? 'text-orange-600'
                      : takenByOther ? 'text-slate-500'
                      : isUnavailable ? 'text-slate-300'
                      : 'text-emjsc-navy'
                  }`}>
                    {syncing ? '...' : isMe ? (swap ? 'Cancel' : <span className="flex items-center gap-0.5">{(([f,...r])=>f+(r[0]?' '+r[0][0]:''))(assignee!.split(' '))}<ArrowLeftRight className="w-2.5 h-2.5 shrink-0" /></span>) : swap ? 'Take It' : assignee ? (([f,...r])=>f+(r[0]?' '+r[0][0]:''))(assignee.split(' ')) : isUnavailable ? 'N/A' : 'Claim'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
