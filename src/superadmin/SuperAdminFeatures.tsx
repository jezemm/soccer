import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, collectionGroup, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Lightbulb, CheckCircle, Trash2, Building2 } from 'lucide-react';
import type { FeatureRequest } from '../lib/firebase';

interface RequestWithTeam extends FeatureRequest {
  clubId: string;
  teamId: string;
  teamLabel: string;
}

export function SuperAdminFeatures() {
  const [requests, setRequests] = useState<RequestWithTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use collectionGroup to query all featureRequests subcollections across all teams
    const q = query(collectionGroup(db, 'featureRequests'), orderBy('submittedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const r: RequestWithTeam[] = snap.docs.map(d => {
        // Path: clubs/{clubId}/teams/{teamId}/featureRequests/{id}
        const pathParts = d.ref.path.split('/');
        const clubId = pathParts[1] || '';
        const teamId = pathParts[3] || '';
        return {
          id: d.id,
          ...(d.data() as Omit<FeatureRequest, 'id'>),
          clubId,
          teamId,
          teamLabel: teamId ? `${clubId.toUpperCase()} / ${teamId}` : 'Legacy',
        };
      });
      setRequests(r);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const markReviewed = async (req: RequestWithTeam) => {
    const path = req.clubId && req.teamId
      ? `clubs/${req.clubId}/teams/${req.teamId}/featureRequests/${req.id}`
      : `featureRequests/${req.id}`;
    await setDoc(doc(db, path), { status: 'reviewed' }, { merge: true });
  };

  const remove = async (req: RequestWithTeam) => {
    const path = req.clubId && req.teamId
      ? `clubs/${req.clubId}/teams/${req.teamId}/featureRequests/${req.id}`
      : `featureRequests/${req.id}`;
    await deleteDoc(doc(db, path));
  };

  const newCount = requests.filter(r => r.status === 'new').length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-xl font-black text-white">Feature Requests</h2>
        {newCount > 0 && (
          <span className="text-xs font-black bg-violet-600 text-white rounded-full px-2 py-0.5">
            {newCount} new
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <Lightbulb size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">No feature requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div
              key={req.id}
              className={`p-4 rounded-xl border ${
                req.status === 'new'
                  ? 'bg-slate-800 border-violet-700/50'
                  : 'bg-slate-900 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-snug">{req.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {req.submitterName && (
                      <span className="text-[10px] font-bold text-slate-400">by {req.submitterName}</span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <Building2 size={10} />
                      {req.teamLabel}
                    </span>
                    {req.status === 'reviewed' && (
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wide">✓ Reviewed</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {req.status === 'new' && (
                    <button
                      onClick={() => markReviewed(req)}
                      className="p-2 rounded-lg bg-emerald-900/50 hover:bg-emerald-700/50 text-emerald-400 transition-colors"
                      title="Mark reviewed"
                    >
                      <CheckCircle size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => remove(req)}
                    className="p-2 rounded-lg bg-slate-700/50 hover:bg-red-900/50 text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
