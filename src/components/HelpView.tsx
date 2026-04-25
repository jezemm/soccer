import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Trash2 } from 'lucide-react';
import { SEED_FAQS } from '../lib/constants';
import type { FaqItem } from '../lib/firebase';

const ALL_ROLES = ['player', 'coach', 'manager'];
const ROLE_LABELS: Record<string, string> = { player: 'Players', coach: 'Coaches', manager: 'Admins' };

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
              onChange(next.length > 0 ? next : value); // prevent empty
            }}
            className="w-3.5 h-3.5 rounded border-slate-300 text-emjsc-navy focus:ring-emjsc-navy"
          />
          <span className="text-[9px] font-black uppercase text-slate-500">{ROLE_LABELS[role]}</span>
        </label>
      ))}
    </div>
  );
}

export function FaqManager({ items = [], onAdd, onUpdate, onDelete, onReset }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState('');
  const [editA, setEditA] = useState('');
  const [editVisibleTo, setEditVisibleTo] = useState<string[]>(ALL_ROLES);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [newVisibleTo, setNewVisibleTo] = useState<string[]>(ALL_ROLES);
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const [localItems, setLocalItems] = useState<any[]>(() =>
    (items as any[]).length > 0 ? items : SEED_FAQS
  );

  React.useEffect(() => {
    if ((items as any[]).length > 0) {
      setLocalItems(items);
    }
  }, [items]);

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditQ(item.question);
    setEditA(item.answer);
    setEditVisibleTo(item.visibleTo || ALL_ROLES);
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = (item: any) => {
    const updated = { ...item, question: editQ, answer: editA, visibleTo: editVisibleTo };
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
      order: (localItems.length > 0 ? Math.max(...localItems.map((i: any) => i.order)) + 1 : 1),
    };
    await onAdd(newItem);
    setNewQ(''); setNewA(''); setNewVisibleTo(ALL_ROLES); setAddStatus(null);
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

  return (
    <div className="space-y-4">
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

        {sorted.length === 0 && (
          <p className="text-[10px] text-slate-400 uppercase font-black text-center py-4">No FAQ items yet. Add one below.</p>
        )}

        <div className="space-y-3">
          {sorted.map((item: any, idx: number) => (
            editingId === item.id ? (
              <div key={item.id} className="p-4 bg-emjsc-navy/5 rounded-2xl border border-emjsc-navy/20 space-y-3">
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
                  <button onClick={() => moveItem(item, -1)} disabled={idx === 0} className="p-0.5 text-slate-400 hover:text-emjsc-navy disabled:opacity-20">
                    <ChevronDown className="w-3 h-3 rotate-180" />
                  </button>
                  <button onClick={() => moveItem(item, 1)} disabled={idx === sorted.length - 1} className="p-0.5 text-slate-400 hover:text-emjsc-navy disabled:opacity-20">
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
            )
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Add New Question</h3>
        {addStatus && <p className="text-[9px] font-black uppercase text-emjsc-red animate-pulse">{addStatus}</p>}
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
    </div>
  );
}

export function HelpView({ faqItems = [], userRole, isAdmin }: any) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen(o => o === id ? null : id);

  const viewerRole = isAdmin ? (userRole || 'manager') : 'player';

  const source = (faqItems as FaqItem[]).length > 0 ? (faqItems as FaqItem[]) : SEED_FAQS as any[];
  const faqs = source
    .filter((i: any) => {
      const vis: string[] = i.visibleTo || ALL_ROLES;
      return vis.includes(viewerRole);
    })
    .map((i: any) => ({ id: i.id, q: i.question, a: i.answer }));

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

      <div className="space-y-2">
        {faqs.map(({ id, q, a }) => (
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

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Still need help?</p>
        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          Contact your team manager directly or reach out via the Messages tab if messaging is enabled.
        </p>
      </div>
    </div>
  );
}
