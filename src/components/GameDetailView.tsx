import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Shield, Users, MapPin, Zap } from 'lucide-react';
import { splitOpponent } from '../lib/constants';

function DutyRow({ label, assignedTo, onSignUp, isMe, swapRequested, onRequestSwap, isSyncing }: any) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-700 leading-tight tracking-tight">{label}</span>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold leading-none ${assignedTo ? 'text-slate-500' : 'text-slate-400 italic font-medium'}`}>
              {assignedTo ? assignedTo : 'Volunteer Needed!'}
            </span>
            {swapRequested && !isMe && (
              <span className="bg-orange-100 text-orange-600 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase border border-orange-200 animate-pulse">SWAP REQ</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSignUp}
            disabled={isSyncing}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all border flex items-center gap-2 ${
              isMe
                ? swapRequested ? 'bg-orange-500 text-white border-orange-500 animate-pulse' : 'bg-emjsc-red text-white border-emjsc-red shadow-lg shadow-red-900/20'
                : (assignedTo && !swapRequested)
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                  : swapRequested
                    ? 'bg-orange-600 text-white border-orange-600 shadow-md ring-4 ring-orange-200'
                    : 'bg-emjsc-navy text-white border-emjsc-navy shadow-md shadow-blue-900/10 active:scale-95'
            } ${isSyncing ? 'opacity-70 grayscale cursor-wait' : ''}`}
          >
            {isSyncing && <Zap className="w-3 h-3 animate-spin" />}
            {isMe ? (swapRequested ? 'Cancel Request' : 'Request Swap') : swapRequested ? 'Claim Swap' : assignedTo ? 'Taken' : 'Claim'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-20 text-center space-y-4">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
        <Calendar className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h3 className="font-bold text-lg">No games scheduled</h3>
        <p className="text-slate-500 text-sm">Please contact your coach for more info.</p>
      </div>
    </div>
  );
}

export function GameDetailView({ game, user, homeGround, feedbacks, onBack, onSignUp, onRequestSwap, isSyncing, availabilities = [], onToggleAvailability, dutiesConfig = [] }: any) {
  const date = new Date(game.date);
  const dateKey = game.date.split('T')[0];
  const isUnavailable = availabilities.some((a: any) => a.playerName === user.displayName && a.dateKey === dateKey && a.isUnavailable);
  const matchAvailabilities = availabilities.filter((a: any) => a.dateKey === dateKey && a.isUnavailable);

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6"
    >
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {game.isHome && (
                <div className="bg-emjsc-red text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">Home Ground Match</div>
              )}
              <div className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-slate-200">Arrive {arrivalTime}</div>
            </div>

            <button
              onClick={() => onToggleAvailability(user.displayName, dateKey)}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-100 bg-white shadow-sm active:scale-95 transition-all"
            >
              <div className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${isUnavailable ? 'bg-red-400' : 'bg-green-400'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${isUnavailable ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isUnavailable ? 'text-red-600' : 'text-green-700'}`}>
                {isUnavailable ? 'Unavailable to Play' : 'Available to Play'}
              </span>
            </button>
          </div>
          <div className="mb-4">
            {(() => { const { club, team } = splitOpponent(game.opponent); return <><h3 className="text-4xl font-black text-slate-800 leading-none tracking-tight uppercase">Vs {team}</h3>{club && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{club}</p>}</>; })()}
          </div>
          <div className="space-y-2">
            <p className="text-slate-500 font-bold text-sm flex items-center gap-2 uppercase tracking-tight">
              <Calendar className="w-4 h-4 text-emjsc-red" />
              {date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Kick Off
            </p>
            <p className="text-emjsc-navy text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emjsc-red" />
              <a
                href={game.mapUrlOverride || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(game.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {game.location}
              </a>
            </p>
          </div>
        </div>

        {matchAvailabilities.length > 0 && (
          <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emjsc-red mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Unavailable Players ({matchAvailabilities.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {matchAvailabilities.map((a: any) => (
                <span key={a.playerName} className="text-[10px] font-bold text-slate-600 bg-white border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
                  {a.playerName}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Volunteer Assignments
            </h4>
            <div className="space-y-5">
              {applicableDuties.map((duty: any) => {
                const assignee = (game.assignments && game.assignments[duty.id]) || (duty.id === 'goalie' ? game.goalie : duty.id === 'snack_provider' ? game.snackProvider : duty.id === 'pitch_marshal' ? game.pitchMarshal : duty.id === 'referee' ? game.referee : null);
                const swapRequested = (game.swapRequests && game.swapRequests[duty.id]) || (duty.id === 'goalie' ? game.goalieSwapRequested : duty.id === 'snack_provider' ? game.snackSwapRequested : duty.id === 'pitch_marshal' ? game.marshalSwapRequested : duty.id === 'referee' ? game.refereeSwapRequested : false);

                return (
                  <DutyRow
                    key={duty.id}
                    label={duty.label}
                    assignedTo={assignee}
                    onSignUp={() => onSignUp(game.id, duty.id)}
                    isMe={assignee === user.displayName}
                    swapRequested={swapRequested}
                    onRequestSwap={(e: any) => { e.stopPropagation(); onRequestSwap(game.id, duty.id); }}
                    isSyncing={isSyncing === `${game.id}-${duty.id}`}
                  />
                );
              })}
              {applicableDuties.length === 0 && <p className="text-center text-[10px] font-black uppercase text-slate-400 py-4 italic">No duties required for this match.</p>}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export { EmptyState };
