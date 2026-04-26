import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Navigation, ArrowLeftRight, Car, RefreshCw, Users, Flag, User } from 'lucide-react';
import { FUNCTIONS_BASE } from '../lib/firebase';
import { splitOpponent, trimOpponentName, getGameMapUrl, formatVenueDisplay, getVenueName, extractDestFromMapUrl } from '../lib/constants';

export function GameCard({ game, onClick, userName, homeGround, feedbacks = [], availabilities = [], dutiesConfig = [], onSignUp, onToggleAvailability, isSyncing, dimmed = false, userCoords = null, onRequestLocation, compact = false }: any) {
  const date = new Date(game.date);
  const dateKey = game.date.split('T')[0];
  const isUnavailable = availabilities.some((a: any) => a.playerName === userName && a.dateKey === dateKey && a.isUnavailable);
  const totalUnavailable = availabilities.filter((a: any) => a.dateKey === dateKey && a.isUnavailable).length;
  const arrivalTime = new Date(date.getTime() - 30 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const rawLocation = game.location || homeGround || '';
  const venueName = getVenueName(rawLocation);
  const travelDest = game.mapUrlOverride
    ? (extractDestFromMapUrl(game.mapUrlOverride) ?? rawLocation.split(/ Midi| Pitch| Field| Pavilion| Quarter| Half/i)[0].trim())
    : rawLocation.split(/ Midi| Pitch| Field| Pavilion| Quarter| Half/i)[0].trim();

  const [myTravelMins, setMyTravelMins] = useState<number | null>(null);
  const [myTravelStatus, setMyTravelStatus] = useState<'idle' | 'locating' | 'done' | 'error'>('idle');

  const fetchWithCoords = (coords: { lat: number; lng: number }) => {
    if (!travelDest) return;
    setMyTravelStatus('locating');
    const origin = `${coords.lat},${coords.lng}`;
    const departureSecs = Math.floor((date.getTime() - 30 * 60000) / 1000);
    fetch(
      `${FUNCTIONS_BASE}/travelTime` +
      `?origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(travelDest)}` +
      `&departureTime=${departureSecs}`
    )
      .then(r => r.json())
      .then(data => {
        if (data.minutes != null) { setMyTravelMins(data.minutes); setMyTravelStatus('done'); }
        else setMyTravelStatus('error');
      })
      .catch(() => setMyTravelStatus('error'));
  };

  // When coords arrive (from app-level location grant), auto-fetch
  useEffect(() => {
    if (userCoords && travelDest && myTravelStatus === 'idle') {
      fetchWithCoords(userCoords);
    }
  }, [userCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRequestTravel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userCoords) {
      fetchWithCoords(userCoords);
    } else {
      onRequestLocation?.();
    }
  };

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
      onClick={onClick}
      className={`bg-white rounded-[1.75rem] shadow-sm border flex flex-col transition-all ${compact ? 'p-3.5 gap-2' : 'p-5 gap-3'} ${
        dimmed
          ? 'opacity-50 grayscale cursor-pointer border-slate-200'
          : `cursor-pointer ${isSwapPending ? 'border-orange-300 bg-orange-50/30' : isMissingDuties ? 'border-amber-200' : 'border-slate-200 hover:border-emjsc-navy'}`
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex flex-col flex-1 min-w-0 ${compact ? 'gap-1' : 'gap-2.5'}`}>
          {/* Date / home-away / unavailable count */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {date.toLocaleString('default', { month: 'short' })} {date.getDate()} • {game.isHome ? 'Home' : 'Away'}
            </p>
            {totalUnavailable > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-black text-slate-500 uppercase bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                <Users className="w-3 h-3" />
                {totalUnavailable} Out
              </div>
            )}
          </div>

          {/* Opponent */}
          <div className="leading-tight">
            <p className={`font-black text-emjsc-navy uppercase italic ${compact ? 'text-base' : 'text-xl'}`}>
              Vs {trimOpponentName(game.opponent)}
            </p>
            {splitOpponent(game.opponent).team && (
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {splitOpponent(game.opponent).team}
              </p>
            )}
          </div>

          {/* Full venue address + navigate — next card only */}
          {!compact && rawLocation && (
            <p className="text-[11px] font-medium text-slate-500 leading-snug">
              {rawLocation}
            </p>
          )}

          {!compact && (
            <a
              href={getGameMapUrl(game)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all w-fit"
            >
              <Navigation className="w-3.5 h-3.5 text-emjsc-red shrink-0" />
              <span className="text-xs text-emjsc-navy font-black uppercase tracking-tight">Navigate</span>
            </a>
          )}

          {/* Availability toggle */}
          {onToggleAvailability && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleAvailability(userName, dateKey); }}
              className="flex items-center gap-2 active:scale-95 transition-all pt-0.5"
            >
              <div className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${isUnavailable ? 'bg-red-400' : 'bg-green-400'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${isUnavailable ? 'left-0.5' : 'left-5'}`} />
              </div>
              <span className={`text-xs font-black uppercase ${isUnavailable ? 'text-red-600' : 'text-green-700'}`}>
                {isUnavailable ? 'Unavailable to Play' : 'Available to Play'}
              </span>
            </button>
          )}
        </div>

        <div className={`flex flex-col items-end shrink-0 ${compact ? 'gap-1' : 'gap-2'}`}>
          {game.opponentLogo && (
            <img
              src={game.opponentLogo}
              alt={game.opponent}
              className="w-12 h-12 object-contain rounded-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="flex flex-col items-end gap-0.5">
            <p className="text-xs text-emjsc-navy font-black leading-none uppercase tracking-tighter">ARRIVE {arrivalTime}</p>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">KO {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          {!compact && (
            <div className="flex flex-col items-end gap-1 mt-0.5">
              {game.travelTimeMinutes && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400" title="Travel time from home ground">
                  <Flag className="w-3 h-3 shrink-0" />
                  <span>{game.travelTimeMinutes}m</span>
                </div>
              )}
              {travelDest && (
                myTravelStatus === 'done' ? (
                  <button
                    onClick={handleRequestTravel}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-emjsc-red active:scale-95 transition-all"
                    title="Travel time from your location — tap to refresh"
                  >
                    <User className="w-3 h-3 shrink-0" />
                    <span>{myTravelMins}m</span>
                  </button>
                ) : myTravelStatus === 'locating' ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-300">
                    <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                  </span>
                ) : (
                  <button
                    onClick={handleRequestTravel}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-300 hover:text-slate-500 active:scale-95 transition-all"
                    title="Tap to get travel time from your location"
                  >
                    <User className="w-3 h-3 shrink-0" />
                    <span>?m</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {onSignUp && applicableDuties.length > 0 && (
        <div className={`border-t border-slate-100 ${compact ? 'pt-2 space-y-1.5' : 'pt-3 space-y-2'}`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Duties</span>
            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
              isSwapPending ? 'bg-orange-50 text-orange-600 border-orange-100' : isMissingDuties ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'
            }`}>
              {isSwapPending ? 'Swap Needed' : isMissingDuties ? 'Help Wanted' : 'Ready'}
            </div>
          </div>
          <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
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
                  className={`px-3 py-2 rounded-xl border transition-all ${
                    isMe
                      ? swap ? 'bg-orange-50 border-orange-300 hover:bg-orange-100 active:scale-95' : 'bg-red-50 border-emjsc-red hover:bg-red-100 active:scale-95'
                      : swap
                        ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-300 active:scale-95'
                        : takenByOther
                          ? 'bg-white border-slate-200 cursor-not-allowed'
                          : isUnavailable
                            ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                            : 'bg-orange-50 border-orange-200 ring-1 ring-orange-300 active:scale-95'
                  } ${syncing ? 'opacity-70 cursor-wait' : ''}`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 truncate">{duty.emoji && <span className="mr-0.5 grayscale">{duty.emoji}</span>}{duty.label}</p>
                  <p className={`text-xs font-black uppercase truncate ${
                    isMe ? (swap ? 'text-orange-600' : 'text-emjsc-red')
                      : swap ? 'text-orange-600'
                      : takenByOther ? 'text-slate-500'
                      : isUnavailable ? 'text-slate-300'
                      : 'text-orange-600'
                  }`}>
                    {syncing ? '...' : isMe ? (swap ? 'Cancel' : <span className="flex items-center gap-0.5">{(([f,...r])=>f+(r[0]?' '+r[0][0]:''))(assignee!.split(' '))}<ArrowLeftRight className="w-3 h-3 shrink-0" /></span>) : swap ? 'Take It' : assignee ? (([f,...r])=>f+(r[0]?' '+r[0][0]:''))(assignee.split(' ')) : isUnavailable ? 'N/A' : 'Claim'}
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
