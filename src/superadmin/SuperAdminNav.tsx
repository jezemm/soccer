import React from 'react';
import { ShieldCheck, Building2, HelpCircle, Lightbulb, Settings, Calendar } from 'lucide-react';

export type SuperAdminTab = 'clubs' | 'fixtures' | 'faq' | 'features' | 'settings';

interface Props {
  activeTab: SuperAdminTab;
  onTabChange: (tab: SuperAdminTab) => void;
  featureCount?: number;
}

const TABS: { id: SuperAdminTab; label: string; icon: React.ReactNode; badge?: boolean }[] = [
  { id: 'clubs',    label: 'Clubs',    icon: <Building2 size={18} /> },
  { id: 'fixtures', label: 'Fixtures', icon: <Calendar size={18} /> },
  { id: 'faq',      label: 'Global FAQ', icon: <HelpCircle size={18} /> },
  { id: 'features', label: 'Requests', icon: <Lightbulb size={18} />, badge: true },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

export function SuperAdminNav({ activeTab, onTabChange, featureCount = 0 }: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-950 border-r border-slate-800 h-screen fixed left-0 top-0 z-40">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.25em] text-violet-400">Soccer Hub</p>
            <p className="text-xs font-black text-white">Super Admin</p>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors relative ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && featureCount > 0 && (
                <span className="ml-auto text-[10px] font-black bg-violet-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                  {featureCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-800 flex">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[9px] font-black uppercase tracking-wider transition-colors relative ${
              activeTab === tab.id ? 'text-violet-400' : 'text-slate-600'
            }`}
          >
            {tab.icon}
            <span className="hidden xs:block">{tab.label}</span>
            {tab.badge && featureCount > 0 && (
              <span className="absolute top-1 right-1/4 text-[8px] font-black bg-violet-500 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {featureCount > 9 ? '9+' : featureCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
}
