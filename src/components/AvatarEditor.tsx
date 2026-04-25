import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Shuffle, Check, RefreshCw } from 'lucide-react';
import { AvatarConfig, AVATAR_OPTIONS, getAvataaarsUrl, getDefaultAvatarConfig } from '../lib/constants';
import { AvatarImage } from './AvatarImage';

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
  'topType','hairColor','accessoriesType','facialHairType','facialHairColor',
  'clotheType','clotheColor','eyeType','eyebrowType','mouthType','skinColor',
];

function formatLabel(val: string): string {
  if (val === 'EMJSCJersey') return '⚽ EMJSC Jersey';
  return val.replace(/([A-Z0-9])/g, ' $1').replace(/^\s/, '').trim();
}

interface AvatarEditorProps {
  initialConfig: AvatarConfig;
  onSave: (config: AvatarConfig, url: string) => Promise<void>;
  onCancel: () => void;
}

export function AvatarEditor({ initialConfig, onSave, onCancel }: AvatarEditorProps) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig);
  const [saving, setSaving] = useState(false);

  const step = (key: keyof AvatarConfig, dir: 1 | -1) => {
    const opts = AVATAR_OPTIONS[key as keyof typeof AVATAR_OPTIONS] as string[];
    if (!opts) return;
    const idx = opts.indexOf(config[key]);
    const next = (idx + dir + opts.length) % opts.length;
    setConfig(c => ({ ...c, [key]: opts[next] }));
  };

  const randomize = () => {
    const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    setConfig({
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

  const handleSave = async () => {
    setSaving(true);
    await onSave(config, getAvataaarsUrl(config));
    setSaving(false);
  };

  const showFacialHairColor = config.facialHairType !== 'Blank';
  const showGraphic = config.clotheType === 'GraphicShirt';
  const isJersey = config.clotheType === 'EMJSCJersey';
  const visibleKeys = DISPLAYED_KEYS.filter(k => {
    if (k === 'facialHairColor' && !showFacialHairColor) return false;
    if (k === 'graphicType' && !showGraphic) return false;
    if (k === 'clotheColor' && isJersey) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="flex justify-center">
        <AvatarImage
          config={config}
          className="w-32 h-32 rounded-[2rem] shadow-xl"
        />
      </div>

      {/* Controls */}
      <div className="space-y-2">
        {visibleKeys.map(key => {
          const opts = AVATAR_OPTIONS[key as keyof typeof AVATAR_OPTIONS] as string[];
          const idx = opts.indexOf(config[key]);
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-24 shrink-0">
                {LABELS[key]}
              </span>
              <div className="flex-1 flex items-center gap-1 min-w-0">
                <button
                  onClick={() => step(key, -1)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all shrink-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                </button>
                <span className="flex-1 text-center text-[10px] font-bold text-slate-700 truncate px-1">
                  {formatLabel(config[key])}
                </span>
                <button
                  onClick={() => step(key, 1)}
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

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={randomize}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 active:scale-95 transition-all"
        >
          <Shuffle className="w-3.5 h-3.5" />
          Random
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 active:scale-95 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emjsc-navy hover:bg-emjsc-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
