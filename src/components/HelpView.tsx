import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Trash2 } from 'lucide-react';
import { SEED_FAQS } from '../lib/constants';
import type { FaqItem } from '../lib/firebase';

const ALL_ROLES = ['player', 'coach', 'manager'];
const ROLE_LABELS: Record<string, string> = { player: 'Players', coach: 'Coaches', manager: 'Admins' };

export const FAQ_CATEGORIES = [
  'General',
  'Getting Started',
  'Schedule & Fixtures',
  'Duties & Volunteers',
  'Availability',
  'Calendar',
  'Messages',
];

const CATEGORY_COLORS: Record<string, string> = {
  'General':               'bg-slate-100 text-slate-500',
  'Getting Started':       'bg-emerald-50 text-emerald-600',
  'Schedule & Fixtures':   'bg-blue-50 text-blue-600',
  'Duties & Volunteers':   'bg-orange-50 text-orange-600',
  'Availability':          'bg-purple-50 text-purple-600',
  'Calendar':              'bg-cyan-50 text-cyan-600',
  'Messages':              'bg-pink-50 text-pink-600',
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'bg-slate-100 text-slate-500';
}

function VisibilityCheckboxes({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {ALL_ROLES.map(role => (
        <label key={role} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={value.includes(role)}
            onChange={(e) => {
              const next = e.target.checked ? [...value, role] : value.filter(r => r !== role);
              onChange(next.length > 0 ? next : value);
            }}
            className="w-3.5 h-3.5 rounded border-slate-300 text-emjsc-navy focus:ring-emjsc-navy"
          />
          <span className="text-[9px] font-black uppercase text-slate-500">{ROLE_LABELS[role]}</span>
        </label>
      ))}
    </div>
  );
}

function CategorySelect({ value, onChange, className = '' }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emjsc-navy ${className}`}
    >
      {FAQ_CATEGORIES.map(c => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

export function FaqManager({ items = [], onAdd, onUpdate, onDelete, onReset }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState('');
  const [editA, setEditA] = useState('');
  const [editVisibleTo, setEditVisibleTo] = useState<string[]>(ALL_ROLES);
  const [editCategory, setEditCategory] = useState(FAQ_CATEGORIES[0]);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [newVisibleTo, setNewVisibleTo] = useState<string[]>(ALL_ROLES);
  const [newCategory, setNewCategory] = useState(FAQ_CATEGORIES[0]);
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const [localItems, setLocalItems] = useState<any[]>(() =>
    (items as any[]).length > 0 ? items : SEED_FAQS
  );

  React.useEffect(() => {
    if ((items as any[]).length > 0) setLocalItems(items);
  }, [items]);

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditQ(item.question);
    setEditA(item.answer);
    setEditVisibleTo(item.visibleTo || ALL_ROLES);
    setEditCategory(item.category || FAQ_CATEGORIES[0]);
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = (item: any) => {
    const updated = { ...item, question: editQ, answer: editA, visibleTo: editVisibleTo, category: editCategory };
    setLocalItems(prev => prev.map(i => i.id === item.id ? updated : i));
    onUpdate(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setLocalItems(prev => prev.filter(i => i.id !== id));
    onDelete(id);
  };

  const handleAdd = async () => {
    if (!newQ.trim() || !newA.trim()) return;
    setAddStatus('Adding...');
    const newItem = {
      question: newQ.trim(),
      answer: newA.trim(),
      visibleTo: newVisibleTo,
      category: newCategory,
      order: (localItems.length > 0 ? Math.max(...localItems.map((i: any) => i.order)) + 1 : 1),
    };
    await onAdd(newItem);
    setNewQ(''); setNewA(''); setNewVisibleTo(ALL_ROLES); setNewCategory(FAQ_CATEGORIES[0]); setAddStatus(null);
  };

  const moveItem = (item: any, dir: -1 | 1) => {
    const sorted = [...localItems].sort((a: any, b: any) => a.order - b.order);
    const idx = sorted.findIndex((i: any) => i.id === item.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swapItem = sorted[swapIdx];
    const a = { ...item, order: swapItem.order };
    const b = { ...swapItem, order: item.order };
    setLocalItems(prev => prev.map(i => i.id === a.id ? a : i.id === b.id ? b : i));
    onUpdate(a);
    onUpdate(b);
  };

  const sorted = [...localItems].sort((a: any, b: any) => a.order - b.order);
  const filtered = filterCategory === 'All' ? sorted : sorted.filter((i: any) => (i.category || 'General') === filterCategory);

  // Group by category for display
  const groups: Record<string, any[]> = {};
  filtered.forEach((item: any) => {
    const cat = item.category || 'General';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });
  const groupOrder = FAQ_CATEGORIES.filter(c => groups[c]);

  return (
    <div className="space-y-4">
      {/* Add New Question */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Add New Question</h3>
        {addStatus && <p className="text-[9px] font-black uppercase text-emjsc-red animate-pulse">{addStatus}</p>}
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Category</label>
          <CategorySelect value={newCategory} onChange={setNewCategory} className="w-full" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Question</label>
          <input
            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none"
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            placeholder="e.g. How do I request a swap?"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Answer</label>
          <textarea
            rows={4}
            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none resize-none leading-relaxed"
            value={newA}
            onChange={(e) => setNewA(e.target.value)}
            placeholder="Write the answer here..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Visible To</label>
          <VisibilityCheckboxes value={newVisibleTo} onChange={setNewVisibleTo} />
        </div>
        <button
          onClick={handleAdd}
          disabled={!newQ.trim() || !newA.trim()}
          className="w-full bg-emjsc-navy text-white text-[10px] font-black uppercase py-3 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-40"
        >
          Add Question
        </button>
      </div>

      {/* FAQ Items */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">FAQ Items</h3>
          <button
            onClick={async () => {
              setResetting(true);
              await onReset();
              setLocalItems(SEED_FAQS as any[]);
              setResetting(false);
            }}
            className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-emjsc-red border border-slate-200 px-2 py-1 rounded-lg transition-all"
          >
            {resetting ? 'Resetting...' : 'Reset to Defaults'}
          </button>
        </div>

        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {['All', ...FAQ_CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${
                filterCategory === cat
                  ? 'bg-emjsc-navy text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-[10px] text-slate-400 uppercase font-black text-center py-4">No FAQ items.</p>
        )}

        {groupOrder.map(cat => (
          <div key={cat} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider ${categoryColor(cat)}`}>{cat}</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            {groups[cat].map((item: any, idx: number) => {
              const catIdx = groups[cat].indexOf(item);
              const sortedIdx = sorted.indexOf(item);
              return editingId === item.id ? (
                <div key={item.id} className="p-4 bg-emjsc-navy/5 rounded-2xl border border-emjsc-navy/20 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Category</label>
                    <CategorySelect value={editCategory} onChange={setEditCategory} className="w-full" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Question</label>
                    <input
                      autoFocus
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy"
                      value={editQ}
                      onChange={(e) => setEditQ(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Answer</label>
                    <textarea
                      rows={4}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emjsc-navy resize-none leading-relaxed"
                      value={editA}
                      onChange={(e) => setEditA(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Visible To</label>
                    <VisibilityCheckboxes value={editVisibleTo} onChange={setEditVisibleTo} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(item)} className="flex-1 bg-emjsc-navy text-white text-[9px] font-black uppercase py-2 rounded-xl active:scale-95 transition-all">Save</button>
                    <button onClick={cancelEdit} className="px-4 bg-slate-100 text-slate-500 text-[9px] font-black uppercase py-2 rounded-xl active:scale-95 transition-all">Cancel</button>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => moveItem(item, -1)} disabled={sortedIdx === 0} className="p-0.5 text-slate-400 hover:text-emjsc-navy disabled:opacity-20">
                      <ChevronDown className="w-3 h-3 rotate-180" />
                    </button>
                    <button onClick={() => moveItem(item, 1)} disabled={sortedIdx === sorted.length - 1} className="p-0.5 text-slate-400 hover:text-emjsc-navy disabled:opacity-20">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-emjsc-navy">{item.question}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{item.answer}</p>
                    <div className="mt-2">
                      <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-1">Visible to</p>
                      <VisibilityCheckboxes
                        value={item.visibleTo || ALL_ROLES}
                        onChange={(next) => {
                          const updated = { ...item, visibleTo: next };
                          setLocalItems(prev => prev.map(i => i.id === item.id ? updated : i));
                          onUpdate(updated);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(item)} className="p-1.5 text-emjsc-navy hover:bg-emjsc-navy/10 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-emjsc-red hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HelpView({ faqItems = [], userRole, isAdmin, onShowTerms }: any) {
  const [open, setOpen] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const toggle = (id: string) => setOpen(o => o === id ? null : id);

  const viewerRole = isAdmin ? (userRole || 'manager') : 'player';

  const source = (faqItems as FaqItem[]).length > 0 ? (faqItems as FaqItem[]) : SEED_FAQS as any[];
  const faqs = source
    .filter((i: any) => {
      const vis: string[] = i.visibleTo || ALL_ROLES;
      return vis.includes(viewerRole);
    })
    .sort((a: any, b: any) => a.order - b.order)
    .map((i: any) => ({ id: i.id, q: i.question, a: i.answer, category: i.category || 'General' }));

  const usedCategories = FAQ_CATEGORIES.filter(c => faqs.some(f => f.category === c));

  const filtered = activeCategory === 'All' ? faqs : faqs.filter(f => f.category === activeCategory);

  const groups: Record<string, typeof faqs> = {};
  filtered.forEach(f => {
    if (!groups[f.category]) groups[f.category] = [];
    groups[f.category].push(f);
  });
  const groupOrder = FAQ_CATEGORIES.filter(c => groups[c]);

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-emjsc-navy rounded-[2.5rem] p-6 text-white space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight leading-none">Help & FAQ</h2>
            <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">EMJSC Team Hub Guide</p>
          </div>
        </div>
        <p className="text-xs text-white/70 font-bold leading-relaxed pt-1">
          Everything you need to know about using the team hub. Tap a question to expand the answer.
        </p>
      </div>

      {/* Category filter */}
      {usedCategories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
              activeCategory === 'All' ? 'bg-emjsc-navy text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          {usedCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                activeCategory === cat ? 'bg-emjsc-navy text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {groupOrder.map(cat => (
          <div key={cat} className="space-y-2">
            {activeCategory === 'All' && (
              <div className="flex items-center gap-2 px-1">
                <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${categoryColor(cat)}`}>{cat}</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
            )}
            {groups[cat].map(({ id, q, a }) => (
              <div
                key={id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${open === id ? 'border-emjsc-navy shadow-sm' : 'border-slate-200'}`}
              >
                <button
                  onClick={() => toggle(id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left"
                >
                  <span className="text-xs font-black text-emjsc-navy uppercase tracking-tight leading-snug flex-1">{q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open === id ? 'rotate-180' : ''}`} />
                </button>
                {open === id && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Still need help?</p>
        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          Contact your team manager directly or reach out via the Messages tab if messaging is enabled.
        </p>
      </div>

      <div className="flex items-center justify-center gap-4 py-2">
        <button
          onClick={() => onShowTerms?.('terms')}
          className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-emjsc-navy transition-colors underline underline-offset-2"
        >
          Terms of Use
        </button>
        <span className="text-slate-200 text-xs">•</span>
        <button
          onClick={() => onShowTerms?.('privacy')}
          className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-emjsc-navy transition-colors underline underline-offset-2"
        >
          Privacy Policy
        </button>
      </div>
    </div>
  );
}
