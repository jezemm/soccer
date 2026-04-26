import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, RefreshCw, Shuffle, User, Lock, Smile, ArrowRight } from 'lucide-react';
import { AvatarConfig, AVATAR_OPTIONS, getAvataaarsUrl, getDefaultAvatarConfig } from '../lib/constants';
import { AvatarImage } from './AvatarImage';
import { CLUB_LOGO } from '../lib/constants';

const LABELS: Record<keyof AvatarConfig, string> = {
  topType: 'Hair / Hat',
  accessoriesType: 'Accessories',
  hairColor: 'Hair Color',
  facialHairType: 'Facial Hair',
  facialHairColor: 'Facial Hair Color',
  clotheType: 'Clothing',
  clotheColor: 'Clothing Color',
  graphicType: 'Graphic',
  eyeType: 'Eyes',
  eyebrowType: 'Eyebrows',
  mouthType: 'Mouth',
  skinColor: 'Skin',
};

const DISPLAYED_KEYS: (keyof AvatarConfig)[] = [
  'topType', 'hairColor', 'accessoriesType', 'facialHairType', 'facialHairColor',
  'clotheType', 'clotheColor', 'eyeType', 'eyebrowType', 'mouthType', 'skinColor',
];

function formatLabel(val: string): string {
  if (val === 'EMJSCJersey') return '⚽ EMJSC Jersey';
  return val.replace(/([A-Z0-9])/g, ' $1').replace(/^\s/, '').trim();
}

interface OnboardingWizardProps {
  playerName: string;
  teamLogoUrl?: string;
  initialProfile?: { skills?: string; avatarConfig?: AvatarConfig; photoUrl?: string };
  onComplete: (data: { skills: string; avatarConfig: AvatarConfig; photoUrl: string; newPassword?: string }) => Promise<void>;
  onSkip: () => void;
}

type Step = 'welcome' | 'avatar' | 'bio' | 'password';
const STEPS: Step[] = ['welcome', 'avatar', 'bio', 'password'];

const STEP_LABELS: Record<Step, string> = {
  welcome: 'Welcome',
  avatar: 'Avatar',
  bio: 'Bio',
  password: 'Password',
};

export function OnboardingWizard({ playerName, teamLogoUrl, initialProfile, onComplete, onSkip }: OnboardingWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(
    initialProfile?.avatarConfig ?? getDefaultAvatarConfig(playerName)
  );
  const [bio, setBio] = useState(initialProfile?.skills ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const goNext = () => { if (stepIndex < STEPS.length - 1) setStepIndex(s => s + 1); };
  const goBack = () => { if (stepIndex > 0) setStepIndex(s => s - 1); };

  const handleFinish = async () => {
    if (newPassword && newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return; }
    if (newPassword && newPassword.trim().length < 4) { setPasswordError('Password must be at least 4 characters'); return; }
    setSaving(true);
    await onComplete({
      skills: bio,
      avatarConfig,
      photoUrl: getAvataaarsUrl(avatarConfig),
      ...(newPassword.trim() ? { newPassword: newPassword.trim() } : {}),
    });
    setSaving(false);
  };

  const randomizeAvatar = () => {
    const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    setAvatarConfig({
      topType: rand(AVATAR_OPTIONS.topType),
      accessoriesType: rand(AVATAR_OPTIONS.accessoriesType),
      hairColor: rand(AVATAR_OPTIONS.hairColor),
      facialHairType: rand(AVATAR_OPTIONS.facialHairType),
      facialHairColor: rand(AVATAR_OPTIONS.facialHairColor),
      clotheType: rand(AVATAR_OPTIONS.clotheType),
      clotheColor: rand(AVATAR_OPTIONS.clotheColor),
      graphicType: rand(AVATAR_OPTIONS.graphicType),
      eyeType: rand(AVATAR_OPTIONS.eyeType),
      eyebrowType: rand(AVATAR_OPTIONS.eyebrowType),
      mouthType: rand(AVATAR_OPTIONS.mouthType),
      skinColor: rand(AVATAR_OPTIONS.skinColor),
    });
  };

  const stepAvatar = (key: keyof AvatarConfig, dir: 1 | -1) => {
    const opts = AVATAR_OPTIONS[key as keyof typeof AVATAR_OPTIONS] as string[];
    if (!opts) return;
    const idx = opts.indexOf(avatarConfig[key]);
    setAvatarConfig(c => ({ ...c, [key]: opts[(idx + dir + opts.length) % opts.length] }));
  };

  const showFacialHairColor = avatarConfig.facialHairType !== 'Blank';
  const showGraphic = avatarConfig.clotheType === 'GraphicShirt';
  const isJersey = avatarConfig.clotheType === 'EMJSCJersey';
  const visibleKeys = DISPLAYED_KEYS.filter(k => {
    if (k === 'facialHairColor' && !showFacialHairColor) return false;
    if (k === 'graphicType' && !showGraphic) return false;
    if (k === 'clotheColor' && isJersey) return false;
    return true;
  });

  return (
    <div className="min-h-dvh w-full flex md:items-center md:justify-center md:bg-slate-200/60">
    <div className="w-full max-w-sm mx-auto flex flex-col h-dvh md:h-auto md:max-h-[92dvh] md:rounded-3xl md:shadow-2xl md:overflow-hidden bg-white">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 shrink-0">
        <img src={teamLogoUrl || CLUB_LOGO} alt="Logo" className="w-7 h-7 object-contain" referrerPolicy="no-referrer" />
        <h1 className="text-xs font-black uppercase tracking-widest text-emjsc-navy">Set Up Your Profile</h1>
        <button onClick={onSkip} className="ml-auto text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
          Skip
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2 px-5 py-2.5 border-b border-slate-100 shrink-0">
        {STEPS.map((step, i) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black border-2 transition-all
                ${i < stepIndex ? 'bg-emjsc-navy border-emjsc-navy text-white' :
                  i === stepIndex ? 'border-emjsc-navy text-emjsc-navy bg-white' :
                    'border-slate-200 text-slate-300 bg-white'}`}>
                {i < stepIndex ? <Check className="w-2.5 h-2.5" /> : i + 1}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest hidden sm:block
                ${i <= stepIndex ? 'text-emjsc-navy' : 'text-slate-300'}`}>
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 max-w-6 transition-all ${i < stepIndex ? 'bg-emjsc-navy' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content — scrollable only when needed (avatar) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">

        {/* Step 1: Welcome */}
        {currentStep === 'welcome' && (
          <div className="flex flex-col items-center text-center gap-4 h-full justify-center">
            <AvatarImage config={avatarConfig} className="w-20 h-20 rounded-[1.5rem] shadow-xl shrink-0" />
            <div className="space-y-1">
              <h2 className="text-xl font-black text-emjsc-navy uppercase tracking-tight leading-none">
                Welcome, {playerName}!
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Let's set up your profile — avatar, bio, and password.
              </p>
            </div>
            <div className="w-full space-y-1.5 text-left">
              {[
                { icon: <User className="w-3 h-3" />, label: 'Customise your avatar' },
                { icon: <Smile className="w-3 h-3" />, label: 'Write a short bio' },
                { icon: <Lock className="w-3 h-3" />, label: 'Set your own password' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-emjsc-navy/10 flex items-center justify-center text-emjsc-navy shrink-0">
                    {icon}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Avatar (scrolls naturally) */}
        {currentStep === 'avatar' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <AvatarImage config={avatarConfig} className="w-16 h-16 rounded-2xl shadow-lg shrink-0" />
              <div>
                <h2 className="text-base font-black text-emjsc-navy uppercase leading-none">Your Avatar</h2>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Customise how you appear to teammates.</p>
                <button
                  onClick={randomizeAvatar}
                  className="mt-1.5 flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 active:scale-95 transition-all"
                >
                  <Shuffle className="w-3 h-3" />
                  Random
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {visibleKeys.map(key => {
                const opts = AVATAR_OPTIONS[key as keyof typeof AVATAR_OPTIONS] as string[];
                const idx = opts.indexOf(avatarConfig[key]);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-20 shrink-0">
                      {LABELS[key]}
                    </span>
                    <div className="flex-1 flex items-center gap-1 min-w-0">
                      <button onClick={() => stepAvatar(key, -1)} className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all shrink-0">
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                      <span className="flex-1 text-center text-[10px] font-bold text-slate-700 truncate px-1">
                        {formatLabel(avatarConfig[key])}
                      </span>
                      <button onClick={() => stepAvatar(key, 1)} className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all shrink-0">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-300 font-bold w-8 text-right shrink-0">
                      {idx + 1}/{opts.length}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Bio */}
        {currentStep === 'bio' && (
          <div className="flex flex-col gap-4 h-full justify-center">
            <div>
              <h2 className="text-xl font-black text-emjsc-navy uppercase leading-none">Your Bio</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Tell your teammates a bit about yourself. You can skip this.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Bio / Skills</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 200))}
                placeholder="e.g. Love playing striker, favourite team is Melbourne City ⚽"
                rows={5}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emjsc-navy/30 focus:border-emjsc-navy resize-none placeholder:text-slate-300"
              />
              <p className="text-right text-[9px] font-bold text-slate-300">{bio.length}/200</p>
            </div>
          </div>
        )}

        {/* Step 4: Password */}
        {currentStep === 'password' && (
          <div className="flex flex-col gap-4 h-full justify-center">
            <div>
              <h2 className="text-xl font-black text-emjsc-navy uppercase leading-none">Your Password</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Set a personal password. Leave blank to keep your current one.</p>
            </div>
            <div className="space-y-3">
              {passwordError && (
                <p className="text-[10px] font-black text-emjsc-red uppercase tracking-wide">{passwordError}</p>
              )}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setPasswordError(null); }}
                  placeholder="Enter new password"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emjsc-navy/30 focus:border-emjsc-navy"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPasswordError(null); }}
                  placeholder="Confirm new password"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emjsc-navy/30 focus:border-emjsc-navy"
                />
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                  Choose something memorable. Your coach or manager can reset it if you forget.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pt-3 border-t border-slate-100 space-y-2 shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-3">
          {stepIndex > 0 && (
            <button
              onClick={goBack}
              disabled={saving}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 active:scale-95 transition-all disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {currentStep !== 'password' ? (
            <button
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emjsc-navy hover:bg-emjsc-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              {currentStep === 'welcome' ? <><span>Get Started</span><ArrowRight className="w-3.5 h-3.5" /></> : <><span>Next</span><ChevronRight className="w-3.5 h-3.5" /></>}
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emjsc-navy hover:bg-emjsc-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Saving…</span></> : <><Check className="w-3.5 h-3.5" /><span>Finish</span></>}
            </button>
          )}
        </div>
        {(currentStep === 'bio' || currentStep === 'password') && (
          <button
            onClick={currentStep === 'password' ? handleFinish : goNext}
            disabled={saving}
            className="w-full py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            {currentStep === 'password' ? 'Skip & Finish' : 'Skip'}
          </button>
        )}
      </div>
    </div>
    </div>
  );
}
