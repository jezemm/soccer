import React, { useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
export function AdminCommunications({
  announcements = [],
  onAddAnnouncement,
  onDeleteAnnouncement,
  onUpdateAnnouncement,
  squad = [],
}: any) {
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnType, setNewAnnType] = useState<'message' | 'goal'>('message');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlayer, setEditPlayer] = useState('');
  const [editContent, setEditContent] = useState('');
  const [addingFeedback, setAddingFeedback] = useState(false);
  const [newFbPlayer, setNewFbPlayer] = useState('');
  const [newFbContent, setNewFbContent] = useState('');

  const playerFeedbacks = (announcements as any[]).filter((a: any) => a.type === 'player_feedback');
  const teamAnns = (announcements as any[]).filter((a: any) => a.type !== 'player_feedback');

  const startEdit = (ann: any) => {
    setEditingId(ann.id);
    setEditPlayer(ann.targetPlayer || '');
    setEditContent(ann.content || '');
    setAddingFeedback(false);
  };

  const saveEdit = (ann: any) => {
    if (!editContent.trim() || !editPlayer) return;
    onUpdateAnnouncement({ ...ann, content: editContent.trim(), targetPlayer: editPlayer });
    setEditingId(null);
  };

  const saveNew = () => {
    if (!newFbContent.trim() || !newFbPlayer) return;
    onAddAnnouncement(newFbContent.trim(), 'player_feedback', newFbPlayer);
    setNewFbContent('');
    setNewFbPlayer('');
    setAddingFeedback(false);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 overflow-hidden">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Coaches Communications</h3>

      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-emjsc-navy">Team Messages & Goals</h4>
        <div className="space-y-3">
          <textarea
            value={newAnnContent}
            onChange={(e) => setNewAnnContent(e.target.value)}
            placeholder="Post a general team message or collective goal..."
            className="w-full h-20 p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emjsc-navy resize-none"
          />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button onClick={() => setNewAnnType('message')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newAnnType === 'message' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}>Message</button>
              <button onClick={() => setNewAnnType('goal')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newAnnType === 'goal' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}>Goal</button>
            </div>
            <div className="flex-1" />
            <button onClick={() => { if (!newAnnContent.trim()) return; onAddAnnouncement(newAnnContent.trim(), newAnnType); setNewAnnContent(''); }} className="bg-emjsc-navy text-white text-[9px] font-black uppercase px-4 py-2 rounded-xl shadow-md active:scale-95 flex items-center gap-2">
              <Plus className="w-3 h-3" />Post
            </button>
          </div>
        </div>
        {teamAnns.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2 max-h-48 overflow-y-auto no-scrollbar">
            {teamAnns.map((ann: any) => (
              <div key={ann.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm group">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ann.type === 'goal' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-1 italic uppercase tracking-tighter">"{ann.content}"</p>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{ann.type} • {ann.timestamp?.toDate ? ann.timestamp.toDate().toLocaleDateString() : 'Just now'}</p>
                </div>
                <button onClick={() => onDeleteAnnouncement(ann.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-emjsc-red transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-emjsc-navy">Individual Player Feedback</h4>
          {!addingFeedback && (
            <button
              onClick={() => { setAddingFeedback(true); setEditingId(null); setNewFbPlayer(''); setNewFbContent(''); }}
              className="bg-emerald-600 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-xl shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3 h-3" />Add
            </button>
          )}
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400 w-28">Player</th>
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Feedback</th>
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400 w-14">Date</th>
                <th className="px-2 py-2 w-14" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {playerFeedbacks.map((ann: any) =>
                editingId === ann.id ? (
                  <tr key={ann.id} className="bg-emerald-50">
                    <td className="px-3 py-2">
                      <select value={editPlayer} onChange={(e) => setEditPlayer(e.target.value)} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none">
                        {squad.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={2} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 outline-none resize-none" />
                    </td>
                    <td className="px-3 py-2" />
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => saveEdit(ann)} className="p-1 bg-emerald-600 text-white rounded-lg"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={ann.id} className="bg-white hover:bg-slate-50 transition-colors group">
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">{ann.targetPlayer}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-[10px] font-medium text-slate-700 leading-relaxed line-clamp-2">{ann.content}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[8px] font-bold text-slate-400">{ann.timestamp?.toDate ? ann.timestamp.toDate().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(ann)} className="p-1 text-emjsc-navy hover:bg-emjsc-navy/10 rounded-lg"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        <button onClick={() => onDeleteAnnouncement(ann.id)} className="p-1 text-emjsc-red hover:bg-red-50 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {addingFeedback && (
                <tr className="bg-emerald-50 border-t border-emerald-100">
                  <td className="px-3 py-2">
                    <select value={newFbPlayer} onChange={(e) => setNewFbPlayer(e.target.value)} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none">
                      <option value="">Player…</option>
                      {squad.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <textarea value={newFbContent} onChange={(e) => setNewFbContent(e.target.value)} placeholder="Write feedback…" rows={2} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 outline-none resize-none placeholder:text-slate-300" />
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={saveNew} className="p-1 bg-emerald-600 text-white rounded-lg"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setAddingFeedback(false)} className="p-1 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              )}
              {playerFeedbacks.length === 0 && !addingFeedback && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest">No feedback yet — click Add to start</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
