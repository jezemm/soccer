import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface Props {
  onSuccess: () => void;
}

export function SuperAdminLogin({ onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const snap = await getDoc(doc(db, 'superadmin', 'config'));
      const stored = snap.exists() ? snap.data().password : null;
      if (!stored) {
        // First-time setup: accept any password and save it
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'superadmin', 'config'), { password: password.trim() });
        localStorage.setItem('superadmin_auth_ts', String(Date.now()));
        onSuccess();
      } else if (password.trim() === stored) {
        localStorage.setItem('superadmin_auth_ts', String(Date.now()));
        onSuccess();
      } else {
        setError('Incorrect password.');
      }
    } catch {
      setError('Connection error. Check Firestore.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-violet-400 mb-1">Soccer Hub</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Super Admin</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Super admin password"
              className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-xs font-bold text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:opacity-50 text-white font-black text-sm rounded-xl transition-colors"
          >
            {loading ? 'Checking...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-8">
          First-time setup: enter any password to create the super admin account.
        </p>
      </div>
    </div>
  );
}
