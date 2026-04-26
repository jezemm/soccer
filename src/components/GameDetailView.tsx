import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Calendar, Shield, Users, MapPin, Zap, Coffee, Star, Navigation, RefreshCw, Car, Flag, User } from 'lucide-react';
import { FUNCTIONS_BASE } from '../lib/firebase';
import { splitOpponent, trimOpponentName, sortCafes, getGameMapUrl, getVenueName, formatVenueDisplay, extractDestFromMapUrl } from '../lib/constants';
import type { NearbyCafe, CafeSortMode } from '../lib/constants';

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

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }, []);

  const [cafeSort, setCafeSort] = useState<CafeSortMode>('weighted');
  const [cafes, setCafes] = useState<NearbyCafe[]>([]);

  const gameLocation = game.location || homeGround || '';
  const venueName = getVenueName(gameLocation);

  const [cafesStatus, setCafesStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    () => gameLocation ? 'loading' : 'idle'
  );

  const lastFetchLocationRef = useRef<string>('');

  const fetchCafes = useCallback((bust?: boolean) => {
    if (!gameLocation) return;
    setCafesStatus('loading');
    setCafes([]);
    const url = `${FUNCTIONS_BASE}/cafesNearby?venue=${encodeURIComponent(gameLocation)}${bust ? '&bust=true' : ''}`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const result: NearbyCafe[] = Array.isArray(data.cafes) ? data.cafes : [];
        setCafes(result);
        setCafesStatus('done');
        lastFetchLocationRef.current = gameLocation;
      })
      .catch(() => setCafesStatus('error'));
  }, [gameLocation]);

  useEffect(() => {
    // Bust cache if location changed mid-session (e.g. admin updated venue)
    const locationChanged = lastFetchLocationRef.current !== '' && gameLocation !== lastFetchLocationRef.current;
    fetchCafes(locationChanged);
  }, [fetchCafes]);

  // Manual refresh always busts the server cache
  const handleRefreshCafes = () => fetchCafes(true);

  const displayCafes = sortCafes(cafes, cafeSort, 3);

  // My-location travel time
  const [myTravelStatus, setMyTravelStatus] = useState<'idle' | 'locating' | 'fetching' | 'done' | 'error'>('idle');
  const [myTravelMinutes, setMyTravelMinutes] = useState<number | null>(null);
  const [myTravelError, setMyTravelError] = useState<string | null>(null);

  const travelDest = game.mapUrlOverride
    ? (extractDestFromMapUrl(game.mapUrlOverride) ?? gameLocation.split(/ Midi| Pitch| Field| Pavilion| Quarter| Half/i)[0].trim())
    : gameLocation.split(/ Midi| Pitch| Field| Pavilion| Quarter| Half/i)[0].trim();

  const getMyTravelTime = () => {
    if (!travelDest) return;
    setMyTravelStatus('locating');
    setMyTravelError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyTravelStatus('fetching');
        const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
        const departureSecs = Math.floor((date.getTime() - 30 * 60000) / 1000);
        fetch(
          `${FUNCTIONS_BASE}/travelTime` +
          `?origin=${encodeURIComponent(origin)}` +
          `&destination=${encodeURIComponent(travelDest)}` +
          `&departureTime=${departureSecs}`
        )
          .then(r => r.json())
          .then(data => {
            if (data.minutes != null) { setMyTravelMinutes(data.minutes); setMyTravelStatus('done'); }
            else { setMyTravelError('No route found'); setMyTravelStatus('error'); }
          })
          .catch(() => { setMyTravelError('Could not calculate route'); setMyTravelStatus('error'); });
      },
      (err) => {
        setMyTravelError(err.code === 1 ? 'Location permission denied' : 'Could not get location');
        setMyTravelStatus('error');
      },
      { timeout: 10000 }
    );
  };

  // Auto-fetch if location permission already granted
  useEffect(() => {
    if (!travelDest) return;
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then(result => { if (result.state === 'granted') getMyTravelTime(); })
        .catch(() => {});
    } else {
      navigator.geolocation.getCurrentPosition(
        () => getMyTravelTime(),
        () => {},
        { timeout: 5000, maximumAge: 300000 }
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${isUnavailable ? 'left-0.5' : 'left-5'}`} />
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
              <h3 className="text-4xl font-black text-slate-800 leading-none tracking-tight uppercase">Vs {trimOpponentName(game.opponent)}</h3>
              {splitOpponent(game.opponent).team && (
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{splitOpponent(game.opponent).team}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-slate-500 font-bold text-sm flex items-center gap-2 uppercase tracking-tight">
              <Calendar className="w-4 h-4 text-emjsc-red" />
              {date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Kick Off
            </p>
            {gameLocation && (
              <p className="text-[11px] font-medium text-slate-500 leading-snug">{gameLocation}</p>
            )}
            <a
              href={getGameMapUrl(game)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all w-fit"
            >
              <Navigation className="w-3.5 h-3.5 text-emjsc-red shrink-0" />
              <span className="text-xs text-emjsc-navy font-black uppercase tracking-tight">Navigate</span>
            </a>
            {!game.isHome && game.travelTimeMinutes && (
              <p className="text-slate-500 font-bold text-sm flex items-center gap-2 uppercase tracking-tight">
                <Flag className="w-4 h-4 text-emjsc-red" />
                ~{game.travelTimeMinutes} min from home ground
              </p>
            )}
            {/* My-location travel time */}
            {venueName && (
              <div className="flex items-center gap-2 flex-wrap">
                {myTravelStatus === 'idle' || myTravelStatus === 'error' ? (
                  <button
                    onClick={getMyTravelTime}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emjsc-navy bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors active:scale-95"
                  >
                    <User className="w-3.5 h-3.5 text-emjsc-red" />
                    {myTravelStatus === 'error' ? 'Try again' : 'Travel time from my location'}
                  </button>
                ) : myTravelStatus === 'locating' || myTravelStatus === 'fetching' ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {myTravelStatus === 'locating' ? 'Getting location…' : 'Calculating route…'}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-slate-700 font-bold text-sm flex items-center gap-2 uppercase tracking-tight">
                      <User className="w-4 h-4 text-emjsc-red" />
                      ~{myTravelMinutes} min from your location
                    </p>
                    <button onClick={getMyTravelTime} className="p-1 rounded-lg hover:bg-slate-100 transition-colors" title="Refresh">
                      <RefreshCw className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                )}
                {myTravelStatus === 'error' && myTravelError && (
                  <span className="text-[9px] font-bold text-emjsc-red uppercase">{myTravelError}</span>
                )}
              </div>
            )}
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
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 shrink-0">
              <Coffee className="w-4 h-4 text-amber-600" />
              Nearby Coffee
            </h4>
            <div className="flex items-center gap-2">
              {cafes.length > 0 && (
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
              {cafesStatus !== 'loading' && (
                <button onClick={handleRefreshCafes} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Refresh">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* Loading skeleton */}
          {cafesStatus === 'loading' && (
            <div className="space-y-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 animate-pulse space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-9 bg-slate-200 rounded-xl mt-3" />
                </div>
              ))}
            </div>
          )}

          {/* Cafe cards */}
          {cafesStatus === 'done' && displayCafes.length > 0 && (
            <div className="space-y-3">
              {displayCafes.map((cafe, i) => (
                <div key={cafe.name} className={`rounded-2xl border p-4 space-y-3 ${i === 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-slate-800 leading-tight">{cafe.name}</p>
                        {i === 0 && <span className="text-[7px] font-black uppercase tracking-widest bg-amber-500 text-white px-1.5 py-0.5 rounded shrink-0">Top Pick</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {cafe.rating !== null && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-[10px] font-black text-amber-700">{cafe.rating.toFixed(1)}</span>
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-slate-400">
                          {cafe.distanceKm < 1 ? `${Math.round(cafe.distanceKm * 1000)} m` : `${cafe.distanceKm.toFixed(1)} km`} away
                        </span>
                      </div>
                      <a href={cafe.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1.5 w-fit group/cafe">
                        <MapPin className="w-3 h-3 text-emjsc-red shrink-0" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight group-hover/cafe:text-emjsc-red transition-colors line-clamp-1">{cafe.address}</span>
                      </a>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(gameLocation)}&waypoints=${encodeURIComponent(cafe.address)}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 w-full text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all active:scale-[0.98] ${i === 0 ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-900/20' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Stop Here on the Way
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {cafesStatus === 'done' && displayCafes.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <p className="text-[10px] text-slate-500 font-medium">No rated cafes found nearby — try Google Maps directly.</p>
              <a
                href={`https://www.google.com/maps/search/cafe+near+${encodeURIComponent(gameLocation)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-md shadow-amber-900/20"
              >
                <Coffee className="w-3.5 h-3.5" />Search on Google Maps
              </a>
            </div>
          )}

          {/* Error state */}
          {cafesStatus === 'error' && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 space-y-3">
              <p className="text-[10px] text-red-600 font-bold">Couldn't load cafes — tap to try again.</p>
              <button onClick={handleRefreshCafes} className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all">
                <RefreshCw className="w-3.5 h-3.5" />Retry
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export { EmptyState };
