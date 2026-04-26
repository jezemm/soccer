import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { KeyRound, Check } from 'lucide-react';

export function SuperAdminSettings() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newPw.trim() || newPw !== confirmPw) {
      setErrorMsg('New passwords do not match.');
      return;
    }
    setStatus('saving');
    try {
      const snap = await getDoc(doc(db, 'superadmin', 'config'));
      const stored = snap.exists() ? snap.data().password : null;
      if (stored && currentPw !== stored) {
        setErrorMsg('Current password is incorrect.');
        setStatus('idle');
        return;
      }
      await setDoc(doc(db, 'superadmin', 'config'), { password: newPw.trim() }, { merge: true });
      localStorage.setItem('superadmin_auth_ts', String(Date.now()));
      setStatus('done');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
      setErrorMsg('Failed to update password.');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-black text-white mb-6">Settings</h2>

      <div className="max-w-md">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound size={16} className="text-violet-400" />
            <h3 className="text-sm font-black text-white">Change Super Admin Password</h3>
          </div>
          <form onSubmit={changePassword} className="space-y-3">
            <input
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              placeholder="Current password"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="New password"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            {errorMsg && <p className="text-red-400 text-xs font-bold">{errorMsg}</p>}
            <button
              type="submit"
              disabled={status === 'saving' || !newPw || !confirmPw}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {status === 'done' ? (
                <><Check size={16} /> Password Updated</>
              ) : status === 'saving' ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
