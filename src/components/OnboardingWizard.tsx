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
  avatar: 'Your Avatar',
  bio: 'Your Bio',
  password: 'Password',
};

const STEP_ICONS: Record<Step, React.ReactNode> = {
  welcome: <Smile className="w-4 h-4" />,
  avatar: <User className="w-4 h-4" />,
  bio: <User className="w-4 h-4" />,
  password: <Lock className="w-4 h-4" />,
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

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) setStepIndex(s => s + 1);
  };
  const goBack = () => {
    if (stepIndex > 0) setStepIndex(s => s - 1);
  };

  const handleFinish = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword && newPassword.trim().length < 4) {
      setPasswordError('Password must be at least 4 characters');
      return;
    }
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
    const next = (idx + dir + opts.length) % opts.length;
    setAvatarConfig(c => ({ ...c, [key]: opts[next] }));
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
    <div className="mobile-container flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-100">
        <img
          src={teamLogoUrl || CLUB_LOGO}
          alt="EMJSC Logo"
          className="w-8 h-8 object-contain"
          referrerPolicy="no-referrer"
        />
        <h1 className="text-sm font-black uppercase tracking-widest text-emjsc-navy">Set Up Your Profile</h1>
        <button
          onClick={onSkip}
          className="ml-auto text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2 px-6 py-4 border-b border-slate-100">
        {STEPS.map((step, i) => (
          <React.Fragment key={step}>
            <div className={`flex items-center gap-1.5 ${i <= stepIndex ? 'text-emjsc-navy' : 'text-slate-300'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all
                ${i < stepIndex ? 'bg-emjsc-navy border-emjsc-navy text-white' :
                  i === stepIndex ? 'border-emjsc-navy text-emjsc-navy bg-white' :
                    'border-slate-200 text-slate-300 bg-white'}`}>
                {i < stepIndex ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest hidden sm:block
                ${i === stepIndex ? 'text-emjsc-navy' : i < stepIndex ? 'text-emjsc-navy' : 'text-slate-300'}`}>
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 max-w-8 transition-all ${i < stepIndex ? 'bg-emjsc-navy' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Step 1: Welcome */}
        {currentStep === 'welcome' && (
          <div className="flex flex-col items-center text-center space-y-6 pt-4">
            <AvatarImage config={avatarConfig} className="w-28 h-28 rounded-[2rem] shadow-xl" />
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-emjsc-navy uppercase tracking-tight leading-none">
                Welcome, {playerName}!
              </h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs">
                Let's personalise your profile. You'll set up your avatar, add a bio, and choose your password.
              </p>
            </div>
            <div className="w-full space-y-2 text-left">
              {[
                { icon: <User className="w-3.5 h-3.5" />, label: 'Customise your avatar' },
                { icon: <Smile className="w-3.5 h-3.5" />, label: 'Write a short bio' },
                { icon: <Lock className="w-3.5 h-3.5" />, label: 'Set your own password' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-emjsc-navy/10 flex items-center justify-center text-emjsc-navy">
                    {icon}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Avatar */}
        {currentStep === 'avatar' && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Step 2 of 4</p>
              <h2 className="text-lg font-black text-emjsc-navy uppercase">Your Avatar</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Customise how you appear to your teammates.</p>
            </div>

            <div className="flex justify-center">
              <AvatarImage config={avatarConfig} className="w-28 h-28 rounded-[2rem] shadow-xl" />
            </div>

            <button
              onClick={randomizeAvatar}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 active:scale-95 transition-all"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Randomise
            </button>

            <div className="space-y-2">
              {visibleKeys.map(key => {
                const opts = AVATAR_OPTIONS[key as keyof typeof AVATAR_OPTIONS] as string[];
                const idx = opts.indexOf(avatarConfig[key]);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-24 shrink-0">
                      {LABELS[key]}
                    </span>
                    <div className="flex-1 flex items-center gap-1 min-w-0">
                      <button
                        onClick={() => stepAvatar(key, -1)}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all shrink-0"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                      <span className="flex-1 text-center text-[10px] font-bold text-slate-700 truncate px-1">
                        {formatLabel(avatarConfig[key])}
                      </span>
                      <button
                        onClick={() => stepAvatar(key, 1)}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all shrink-0"
                      >
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
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Step 3 of 4</p>
              <h2 className="text-lg font-black text-emjsc-navy uppercase">Your Bio</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Tell your teammates a bit about yourself. You can skip this for now.</p>
            </div>

            <div className="flex justify-center">
              <AvatarImage config={avatarConfig} className="w-20 h-20 rounded-[1.5rem] shadow-lg" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Bio / Skills
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 200))}
                placeholder="e.g. Love playing striker, favourite team is Melbourne City ⚽"
                rows={4}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emjsc-navy/30 focus:border-emjsc-navy resize-none placeholder:text-slate-300"
              />
              <p className="text-right text-[9px] font-bold text-slate-300">{bio.length}/200</p>
            </div>
          </div>
        )}

        {/* Step 4: Password */}
        {currentStep === 'password' && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Step 4 of 4</p>
              <h2 className="text-lg font-black text-emjsc-navy uppercase">Your Password</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Set a personal password. Leave blank to keep your current one.</p>
            </div>

            <div className="flex justify-center">
              <AvatarImage config={avatarConfig} className="w-20 h-20 rounded-[1.5rem] shadow-lg" />
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

      {/* Footer navigation */}
      <div className="p-6 border-t border-slate-100 space-y-3">
        <div className="flex gap-3">
          {stepIndex > 0 && (
            <button
              onClick={goBack}
              disabled={saving}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 active:scale-95 transition-all disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {currentStep !== 'password' ? (
            <button
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emjsc-navy hover:bg-emjsc-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              {currentStep === 'welcome' ? (
                <>Get Started <ArrowRight className="w-3.5 h-3.5" /></>
              ) : (
                <>Next <ChevronRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emjsc-navy hover:bg-emjsc-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                ) : (
                  <><Check className="w-3.5 h-3.5" /> Finish</>
                )}
              </button>
            </>
          )}
        </div>

        {(currentStep === 'bio' || currentStep === 'password') && (
          <button
            onClick={currentStep === 'password' ? handleFinish : goNext}
            disabled={saving}
            className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            {currentStep === 'password' ? 'Skip & Finish' : 'Skip'}
          </button>
        )}
      </div>
    </div>
  );
}
