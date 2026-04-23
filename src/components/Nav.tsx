import React from 'react';

export function DesktopNavButton({ active, onClick, icon, label, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-black uppercase transition-all border relative ${
        active
          ? 'bg-emjsc-navy text-white border-emjsc-navy shadow-md'
          : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-50 hover:text-emjsc-navy'
      }`}
    >
      {icon}
      <span className="tracking-widest">{label}</span>
      {badge > 0 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-emjsc-red text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-md border border-white/20">
          {badge}
        </span>
      )}
    </button>
  );
}

export function MobileNavItem({ active, onClick, icon, label, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all relative ${
        active
          ? 'bg-emjsc-navy text-white shadow-lg shadow-emjsc-navy/20'
          : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
      {badge > 0 && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-emjsc-red text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-md border border-white/20">
          {badge}
        </span>
      )}
    </button>
  );
}

export function NavTab({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
        active
          ? 'bg-emjsc-navy text-white border-emjsc-navy shadow-md'
          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {icon}
      <span className="uppercase tracking-widest">{label}</span>
    </button>
  );
}

export function NavButton({ active, onClick, icon, badge }: any) {
  return (
    <button onClick={onClick} className={`p-2 transition-colors relative ${active ? 'text-emjsc-navy' : 'text-slate-300'}`}>
      {icon}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-emjsc-red text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse border-2 border-white shadow-sm font-black">
          {badge}
        </span>
      )}
    </button>
  );
}
