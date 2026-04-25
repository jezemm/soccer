import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Shield, Users, MapPin, Zap, Coffee, Star, Navigation } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { splitOpponent, getCafesForLocation, sortCafes, getGameMapUrl, getVenueName, formatVenueDisplay } from '../lib/constants';
import type { NearbyCafe, CafeSortMode } from '../lib/constants';

const getNearbyPlaces = httpsCallable<{ venue: string }, { cafes: NearbyCafe[] }>(functions, 'nearbyPlaces');

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

  const [cafeSort, setCafeSort] = useState<CafeSortMode>('weighted');
  const [apiCafes, setApiCafes] = useState<NearbyCafe[] | null>(null);
  const [cafesLoading, setCafesLoading] = useState(false);

  // Use homeGround as fallback so the section shows for home games too
  const gameLocation = game.location || homeGround || '';
  const venueName = getVenueName(gameLocation);
  useEffect(() => {
    if (!venueName) return;
    setCafesLoading(true);
    setApiCafes(null);
    getNearbyPlaces({ venue: venueName + ' Melbourne VIC' })
      .then((result) => setApiCafes(result.data.cafes?.length ? result.data.cafes : null))
      .catch(() => setApiCafes(null))
      .finally(() => setCafesLoading(false));
  }, [venueName]);

  const allCafes = apiCafes ?? getCafesForLocation(gameLocation);
  const nearbyCafes = sortCafes(allCafes, cafeSort, 3);

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
          <div className="mb-4 flex items-center gap-4">
            {game.opponentLogo && (
              <img
                src={game.opponentLogo}
                alt={game.opponent}
                className="w-16 h-16 object-contain rounded-2xl shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div>
              {(() => { const { club, team } = splitOpponent(game.opponent); return <><h3 className="text-4xl font-black text-slate-800 leading-none tracking-tight uppercase">Vs {club || team}</h3>{club && team && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{team}</p>}</>; })()}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-slate-500 font-bold text-sm flex items-center gap-2 uppercase tracking-tight">
              <Calendar className="w-4 h-4 text-emjsc-red" />
              {date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Kick Off
            </p>
            <p className="text-emjsc-navy text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emjsc-red" />
              <a
                href={getGameMapUrl(game)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {formatVenueDisplay(game.location)}
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

      {gameLocation && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 shrink-0">
              <Coffee className={`w-4 h-4 text-amber-600 ${cafesLoading ? 'animate-pulse' : ''}`} />
              Nearby Coffee
              {cafesLoading && <span className="text-[8px] text-slate-300 normal-case font-bold tracking-normal">Loading…</span>}
            </h4>
            {allCafes.length > 0 && (
              <div className="flex p-0.5 bg-slate-100 rounded-xl gap-0.5">
                {([['nearest', 'Nearest'], ['rated', 'Top Rated'], ['weighted', 'Best Match']] as [CafeSortMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setCafeSort(mode)}
                    className={`px-2.5 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${cafeSort === mode ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-400'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {nearbyCafes.length > 0 ? (
            <div className="space-y-3">
              {nearbyCafes.map((cafe, i) => (
                <div key={cafe.name} className={`rounded-2xl border p-4 space-y-3 ${i === 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-slate-800">{cafe.name}</p>
                      {i === 0 && <span className="text-[7px] font-black uppercase tracking-widest bg-amber-500 text-white px-1.5 py-0.5 rounded shrink-0">Top Pick</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {cafe.rating !== null && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="text-[10px] font-black text-amber-700">{cafe.rating.toFixed(1)}</span>
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-slate-400">{cafe.distanceKm < 1 ? `${Math.round(cafe.distanceKm * 1000)} m` : `${cafe.distanceKm.toFixed(1)} km`} away</span>
                    </div>
                    {cafe.description && <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">{cafe.description}</p>}
                    <a
                      href={cafe.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 mt-1.5 w-fit group/cafe"
                    >
                      <MapPin className="w-3 h-3 text-emjsc-red shrink-0" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight group-hover/cafe:text-emjsc-red transition-colors">{cafe.address}</span>
                    </a>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getVenueName(gameLocation) + ' Melbourne VIC')}&waypoints=${encodeURIComponent(cafe.address)}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 w-full text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all ${i === 0 ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-900/20' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} active:scale-[0.98]`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Stop Here on the Way
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                We don't have curated cafe picks for this venue yet — but Google Maps has you covered.
              </p>
              <a
                href={`https://www.google.com/maps/search/cafe+near+${encodeURIComponent(getVenueName(gameLocation) + ' Melbourne VIC')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-md shadow-amber-900/20"
              >
                <Coffee className="w-3.5 h-3.5" />
                Find Cafes Near {getVenueName(gameLocation)}
              </a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getVenueName(gameLocation) + ' Melbourne VIC')}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                Get Directions to Venue
              </a>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export { EmptyState };
