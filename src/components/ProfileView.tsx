import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Zap, Pencil } from 'lucide-react';
import { playerAvatar, getAvataaarsUrl, getDefaultAvatarConfig, AvatarConfig } from '../lib/constants';
import { AvatarEditor } from './AvatarEditor';

export function ProfileView({ userName, profiles, feedbacks, games, onUpdateProfile }: any) {
  const profileKey = (userName || '').replace(/\s+/g, '_');
  const profile = profiles[profileKey] || {};
  const [skills, setSkills] = useState(profile.skills || '');
  const [isSaving, setIsSaving] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);

  const photoUrl = profile.photoUrl || playerAvatar(userName);

  const myFeedbacks = feedbacks
    .filter((f: any) => f.playerName === userName)
    .sort((a: any, b: any) => {
      const gA = games.find((g: any) => g.id === a.gameId);
      const gB = games.find((g: any) => g.id === b.gameId);
      return new Date(gB?.date || 0).getTime() - new Date(gA?.date || 0).getTime();
    });

  useEffect(() => {
    if (profile.skills) setSkills(profile.skills);
  }, [profile.skills]);

  const handleSaveSkills = async () => {
    setIsSaving(true);
    await onUpdateProfile(skills, photoUrl, profile.avatarConfig);
    setIsSaving(false);
  };

  const handleSaveAvatar = async (config: AvatarConfig, url: string) => {
    await onUpdateProfile(skills, url, config);
    setEditingAvatar(false);
  };

  const currentAvatarConfig: AvatarConfig = profile.avatarConfig || getDefaultAvatarConfig(userName || '');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl shadow-slate-200/50 space-y-8">
        <div className="text-center space-y-4">
          <div className="relative inline-block group">
            <img
              src={photoUrl}
              alt="Profile"
              className="w-32 h-32 rounded-[2rem] shadow-2xl transition-all duration-300"
            />
            <button
              onClick={() => setEditingAvatar(true)}
              className="absolute -bottom-2 -right-2 bg-emjsc-navy text-white p-2 rounded-xl shadow-lg active:scale-95 transition-all hover:bg-emjsc-red"
              title="Edit avatar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <h2 className="text-2xl font-black text-emjsc-navy uppercase tracking-tight">{userName}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">EMJSC • U8 White Saturday</p>
          </div>
        </div>

        {editingAvatar ? (
          <AvatarEditor
            initialConfig={currentAvatarConfig}
            onSave={handleSaveAvatar}
            onCancel={() => setEditingAvatar(false)}
          />
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">My Skills & Description</label>
              <textarea
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Tell the team about your skills, favourite position, or what you're working on!"
                className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emjsc-navy outline-none resize-none transition-all placeholder:text-slate-300"
              />
            </div>

            <button
              onClick={handleSaveSkills}
              disabled={isSaving}
              className="w-full bg-emjsc-navy text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 active:scale-95 transition-all hover:bg-emjsc-red disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {isSaving ? 'Saving Changes...' : 'Update Player Profile'}
            </button>
          </div>
        )}
      </div>

      {myFeedbacks.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-black text-emjsc-navy uppercase tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-emjsc-red" />
            Coach Feedback History
          </h3>
          <div className="space-y-4">
            {myFeedbacks.map((f: any) => {
              const game = games.find((g: any) => g.id === f.gameId);
              return (
                <div key={f.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {game ? `vs ${game.opponent} • ${new Date(game.date).toLocaleDateString()}` : 'Past Match'}
                    </p>
                  </div>
                  {f.goals && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-orange-600 tracking-wider">Coach's Goals:</p>
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">{f.goals}</p>
                    </div>
                  )}
                  {f.feedback && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-emjsc-navy tracking-wider">Performance Feedback:</p>
                      <p className="text-xs font-bold text-slate-600 italic uppercase tracking-tight leading-relaxed">"{f.feedback}"</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-emjsc-red/5 border-2 border-dashed border-emjsc-red/20 rounded-3xl p-6 flex gap-4">
        <Zap className="w-6 h-6 text-emjsc-red shrink-0" />
        <p className="text-[10px] font-bold text-emjsc-red uppercase tracking-wide leading-relaxed">
          Tip: Tap the pencil icon on your avatar to customise it! Your skills description will be shared with the rest of the squad to help everyone learn your strengths.
        </p>
      </div>
    </div>
  );
}
