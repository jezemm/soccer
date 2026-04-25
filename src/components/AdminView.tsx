import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Shield, Users, Utensils, MessageCircle, Settings,
  HelpCircle, Lock, Unlock, AlertCircle, Trash2, RefreshCw, Zap,
  Check, X, Plus, Lightbulb, Mail, CalendarDays
} from 'lucide-react';
import { AdminCommunications } from './AdminCommunications';
import { AdminModeration } from './AdminModeration';
import { MatchEditor } from './MatchEditor';
import { DutyManager } from './DutyManager';
import { FaqManager } from './HelpView';

function AdminDutySelector({ label, value, onSelect, squad = [] }: any) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-50">
      <span className="text-[10px] font-black uppercase text-slate-400">{label}</span>
      <select
        value={value || ""}
        onChange={(e) => onSelect(e.target.value)}
        className="text-[10px] font-black text-emjsc-navy uppercase bg-slate-50 p-2 rounded-lg border-none focus:ring-1 focus:ring-emjsc-navy outline-none"
      >
        <option value="">(Empty)</option>
        {squad.map((p: any) => (
          <option key={p.name} value={p.name}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}

function SquadManager({ squad, onUpdate, passwords, onUpdatePasswords, staffAccounts = [], onUpdateStaff, userRole }: any) {
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editFact, setEditFact] = React.useState('');
  const [newName, setNewName] = React.useState('');
  const [newFact, setNewFact] = React.useState('');
  const [adding, setAdding] = React.useState(false);

  // Staff account management state
  const [editingStaffIdx, setEditingStaffIdx] = React.useState<number | null>(null);
  const [editStaffName, setEditStaffName] = React.useState('');
  const [editStaffRole, setEditStaffRole] = React.useState('coach');
  const [editStaffPass, setEditStaffPass] = React.useState('');
  const [editStaffTagline, setEditStaffTagline] = React.useState('');
  const [addingStaff, setAddingStaff] = React.useState(false);
  const [newStaffName, setNewStaffName] = React.useState('');
  const [newStaffRole, setNewStaffRole] = React.useState('coach');
  const [newStaffPass, setNewStaffPass] = React.useState('');
  const [newStaffTagline, setNewStaffTagline] = React.useState('');

  const startEdit = (i: number) => { setEditingIdx(i); setEditName(squad[i].name); setEditFact(squad[i].fact); };
  const saveEdit = () => {
    if (!editName.trim()) return;
    const oldName = squad[editingIdx!].name;
    const nextName = editName.trim();
    onUpdate(squad.map((p: any, i: number) => i === editingIdx ? { name: nextName, fact: editFact.trim() } : p));
    if (oldName !== nextName && passwords?.players?.[oldName] !== undefined) {
      const np = { ...passwords.players, [nextName]: passwords.players[oldName] };
      delete np[oldName];
      onUpdatePasswords({ ...passwords, players: np });
    }
    setEditingIdx(null);
  };
  const remove = (i: number) => {
    if (!window.confirm(`Remove ${squad[i].name} from the squad?`)) return;
    onUpdate(squad.filter((_: any, idx: number) => idx !== i));
  };
  const addNew = () => {
    if (!newName.trim()) return;
    onUpdate([...squad, { name: newName.trim(), fact: newFact.trim() || 'A valued member of the squad' }]);
    setNewName(''); setNewFact(''); setAdding(false);
  };

  const startEditStaff = (i: number) => {
    setEditingStaffIdx(i); setEditStaffName(staffAccounts[i].name);
    setEditStaffRole(staffAccounts[i].role); setEditStaffPass(staffAccounts[i].password);
    setEditStaffTagline(staffAccounts[i].tagline || '');
  };
  const saveEditStaff = () => {
    if (!editStaffName.trim()) return;
    onUpdateStaff(staffAccounts.map((a: any, i: number) => i === editingStaffIdx
      ? { ...a, name: editStaffName.trim(), role: editStaffRole, password: editStaffPass || a.password, tagline: editStaffTagline.trim() }
      : a));
    setEditingStaffIdx(null);
  };
  const removeStaff = (i: number) => {
    if (staffAccounts.length <= 1) return;
    if (!window.confirm(`Remove ${staffAccounts[i].name} from staff?`)) return;
    onUpdateStaff(staffAccounts.filter((_: any, idx: number) => idx !== i));
  };
  const addStaff = () => {
    if (!newStaffName.trim() || !newStaffPass.trim()) return;
    const id = `staff_${Date.now()}`;
    onUpdateStaff([...staffAccounts, { id, name: newStaffName.trim(), role: newStaffRole, password: newStaffPass.trim(), tagline: newStaffTagline.trim() }]);
    setNewStaffName(''); setNewStaffRole('coach'); setNewStaffPass(''); setNewStaffTagline(''); setAddingStaff(false);
  };

  const editPencil = (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );

  const isManager = userRole === 'manager' || !userRole;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Coaches & Staff</p>
          {isManager && !addingStaff && (
            <button onClick={() => { setAddingStaff(true); setEditingStaffIdx(null); }} className="text-[8px] font-black uppercase tracking-widest text-emjsc-navy bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 hover:bg-slate-100 flex items-center gap-1">
              <Plus className="w-2.5 h-2.5" />Add
            </button>
          )}
        </div>
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Name</th>
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Role</th>
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">Description</th>
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Password</th>
                {isManager && <th className="px-2 py-2 w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffAccounts.map((a: any, i: number) => editingStaffIdx === i ? (
                <tr key={a.id} className="bg-blue-50">
                  <td className="px-3 py-2"><input autoFocus value={editStaffName} onChange={e => setEditStaffName(e.target.value)} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none" /></td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <select value={editStaffRole} onChange={e => setEditStaffRole(e.target.value)} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none">
                      <option value="coach">Coach</option>
                      <option value="manager">Manager</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell"><input value={editStaffTagline} onChange={e => setEditStaffTagline(e.target.value)} placeholder="Description shown on Squad page…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 outline-none" /></td>
                  <td className="px-3 py-2"><input value={editStaffPass} onChange={e => setEditStaffPass(e.target.value)} placeholder="New password…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none font-mono" /></td>
                  <td className="px-2 py-2"><div className="flex gap-1">
                    <button onClick={saveEditStaff} className="p-1 bg-emjsc-navy text-white rounded-lg"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setEditingStaffIdx(null)} className="p-1 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3 h-3" /></button>
                  </div></td>
                </tr>
              ) : (
                <tr key={a.id} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5"><span className="text-[10px] font-black text-emjsc-navy uppercase">{a.name}</span></td>
                  <td className="px-3 py-2.5 hidden md:table-cell"><span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${a.role === 'manager' ? 'bg-emjsc-navy/10 text-emjsc-navy' : 'bg-amber-50 text-amber-700'}`}>{a.role}</span></td>
                  <td className="px-3 py-2.5 hidden sm:table-cell"><p className="text-[9px] text-slate-500 line-clamp-1">{a.tagline || <span className="italic text-slate-300">No description</span>}</p></td>
                  <td className="px-3 py-2"><span className="text-[10px] font-mono text-slate-400">{'•'.repeat(Math.min(a.password?.length || 0, 8))}</span></td>
                  {isManager && <td className="px-2 py-2.5"><div className="flex gap-1">
                    <button onClick={() => startEditStaff(i)} className="p-1 text-emjsc-navy hover:bg-emjsc-navy/10 rounded-lg">{editPencil}</button>
                    {staffAccounts.length > 1 && <button onClick={() => removeStaff(i)} className="p-1 text-emjsc-red hover:bg-red-50 rounded-lg"><Trash2 className="w-3 h-3" /></button>}
                  </div></td>}
                </tr>
              ))}
              {addingStaff && (
                <tr className="bg-green-50 border-t border-green-100">
                  <td className="px-3 py-2"><input autoFocus value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="Full name…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none placeholder:text-slate-300" /></td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none">
                      <option value="coach">Coach</option>
                      <option value="manager">Manager</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell"><input value={newStaffTagline} onChange={e => setNewStaffTagline(e.target.value)} placeholder="Description (optional)…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 outline-none placeholder:text-slate-300" /></td>
                  <td className="px-3 py-2"><input value={newStaffPass} onChange={e => setNewStaffPass(e.target.value)} placeholder="Password…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none font-mono placeholder:text-slate-300" /></td>
                  <td className="px-2 py-2"><div className="flex gap-1">
                    <button onClick={addStaff} className="p-1 bg-green-600 text-white rounded-lg"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setAddingStaff(false)} className="p-1 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3 h-3" /></button>
                  </div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Players</p>
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Name</th>
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">Tagline</th>
                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Password</th>
                <th className="px-2 py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {squad.map((p: any, i: number) => editingIdx === i ? (
                <tr key={i} className="bg-blue-50">
                  <td className="px-3 py-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none" />
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell">
                    <input value={editFact} onChange={e => setEditFact(e.target.value)} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 outline-none" />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      key={`${p.name}-${passwords?.players?.[p.name]}`}
                      type="text"
                      defaultValue={passwords?.players?.[p.name] || ''}
                      onBlur={(e) => onUpdatePasswords({ ...passwords, players: { ...passwords?.players, [p.name]: e.target.value.trim() || passwords?.players?.[p.name] } })}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none font-mono"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="p-1 bg-emjsc-navy text-white rounded-lg"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setEditingIdx(null)} className="p-1 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={i} className="bg-white hover:bg-slate-50 group transition-colors">
                  <td className="px-3 py-2.5"><span className="text-[10px] font-black text-emjsc-navy uppercase">{p.name}</span></td>
                  <td className="px-3 py-2.5 hidden sm:table-cell"><p className="text-[9px] text-slate-500 line-clamp-1">{p.fact}</p></td>
                  <td className="px-3 py-2">
                    <input
                      key={`${p.name}-${passwords?.players?.[p.name]}`}
                      type="text"
                      defaultValue={passwords?.players?.[p.name] || ''}
                      onBlur={(e) => onUpdatePasswords({ ...passwords, players: { ...passwords?.players, [p.name]: e.target.value.trim() || passwords?.players?.[p.name] } })}
                      className="w-full p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy font-mono"
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(i)} className="p-1 text-emjsc-navy hover:bg-emjsc-navy/10 rounded-lg">{editPencil}</button>
                      <button onClick={() => remove(i)} className="p-1 text-emjsc-red hover:bg-red-50 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {adding && (
                <tr className="bg-green-50 border-t border-green-100">
                  <td className="px-3 py-2">
                    <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Player name…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none placeholder:text-slate-300" />
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell">
                    <input value={newFact} onChange={e => setNewFact(e.target.value)} placeholder="Tagline (optional)…" className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 outline-none placeholder:text-slate-300" />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[9px] text-slate-300 font-bold italic">Set after saving</span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button onClick={addNew} className="p-1 bg-green-600 text-white rounded-lg"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setAdding(false)} className="p-1 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditingIdx(null); }} className="w-full bg-slate-50 text-emjsc-navy border border-slate-200 font-black py-2.5 rounded-xl uppercase tracking-[0.1em] text-[9px] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <Plus className="w-3.5 h-3.5" />Add Player
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminView({
  userName,
  games,
  isLoggedIn,
  password,
  onPasswordChange,
  onLogin,
  loginError,
  onAutoAllocate,
  onClearDuties,
  adminActionStatus,
  onManualAssign,
  onSaveGame,
  trainingCancelled,
  onToggleTraining,
  trainingLocation,
  onUpdateTrainingLocation,
  homeGround,
  onUpdateHomeGround,
  onRefreshTravelTimes,
  onBulkSync,
  onScrapeDribl,
  onClearSchedule,
  onDeleteGame,
  coachChild,
  onUpdateCoachChild,
  coachExemptDuties,
  onUpdateCoachExemptDuties,
  feedbacks,
  messages,
  blocks,
  announcements,
  onUpdateFeedback,
  onAdminDeleteMessage,
  onAdminDeleteBlock,
  onAddAnnouncement,
  onUpdateAnnouncement: handleUpdateAnnouncement,
  onDeleteAnnouncement,
  availabilities,
  messagingEnabled,
  onUpdateMessagingEnabled,
  dutiesConfig,
  onUpdateDutyConfig,
  onAddDutyConfig,
  onDeleteDutyConfig,
  onAddGame,
  faqItems = [],
  onAddFaqItem,
  onUpdateFaqItem,
  onDeleteFaqItem,
  onResetFaq,
  passwords,
  onUpdatePasswords,
  squad = [],
  onUpdateSquad,
  userRole,
  staffAccounts = [],
  onUpdateStaff,
  featureRequests = [],
  onMarkFeatureReviewed,
  onDeleteFeatureRequest,
  notificationSettings = {},
  onUpdateNotificationSettings,
  calendarVersion = 0,
  calendarUpdatedAt = null,
  onForceCalendarRefresh,
}: any) {
  const [bulkJson, setBulkJson] = useState('');
  const [activeTab, setActiveTab] = useState('matches');

  if (!isLoggedIn) {
    return (
      <div className="max-w-sm mx-auto space-y-6 pt-12">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emjsc-navy rounded-full flex items-center justify-center mx-auto text-white shadow-xl">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight text-emjsc-navy">Admin Access</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Authorized Club Officials Only</p>
        </div>
        <div className="space-y-3">
          {loginError && (
            <div className="bg-red-50 text-red-600 text-[10px] font-black uppercase px-4 py-2 rounded-xl border border-red-100 flex items-center justify-center gap-2">
              <AlertCircle className="w-3 h-3" />
              {loginError}
            </div>
          )}
          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLogin()}
            className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emjsc-navy outline-none font-bold text-center"
          />
          <button
            onClick={onLogin}
            className="w-full bg-emjsc-navy text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-xs"
          >
            <Unlock className="w-4 h-4" />
            Unlock Admin Hub
          </button>
        </div>
      </div>
    );
  }

  const newFeatureCount = (featureRequests as any[]).filter((r: any) => r.status !== 'reviewed').length;

  const tabs = [
    { id: 'matches', label: 'Match Day', icon: <Calendar className="w-3 h-3" /> },
    { id: 'content', label: 'Coach Wrap', icon: <MessageCircle className="w-3 h-3" /> },
    ...(messagingEnabled ? [{ id: 'moderate', label: 'Moderation', icon: <Shield className="w-3 h-3" /> }] : []),
    { id: 'duties', label: 'Duty Manager', icon: <Utensils className="w-3 h-3" /> },
    { id: 'squad', label: 'Squad', icon: <Users className="w-3 h-3" /> },
    { id: 'faq', label: 'FAQ', icon: <HelpCircle className="w-3 h-3" /> },
    { id: 'features', label: 'Features', icon: <Lightbulb className="w-3 h-3" />, badge: newFeatureCount },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight text-emjsc-navy uppercase">Admin Hub</h2>
          {trainingCancelled && (
            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emjsc-red animate-pulse" />
              <span className="text-[8px] font-black uppercase text-slate-500">Training Cancelled</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-2 -mx-2 px-2 custom-scrollbar no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 border ${
                activeTab === tab.id
                  ? 'bg-emjsc-navy text-white border-emjsc-navy shadow-lg shadow-blue-900/20'
                  : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {(tab as any).badge > 0 && (
                <span className="bg-emjsc-red text-white text-[7px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center shrink-0">{(tab as any).badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {adminActionStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-[10px] font-black uppercase px-6 py-3 rounded-2xl text-center shadow-lg border-b-4 ${
            adminActionStatus.includes('Failed')
              ? 'bg-emjsc-red text-white border-red-800'
              : 'bg-green-600 text-white border-green-800'
          }`}
        >
          {adminActionStatus}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'content' && (
          <motion.div key="content" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <AdminCommunications
              announcements={announcements}
              onAddAnnouncement={onAddAnnouncement}
              onDeleteAnnouncement={onDeleteAnnouncement}
              onUpdateAnnouncement={handleUpdateAnnouncement}
              squad={squad}
            />
          </motion.div>
        )}

        {activeTab === 'matches' && (
          <motion.div key="matches" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Match Day Operations</h3>
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-emjsc-navy leading-none">Training Status</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase">{trainingCancelled ? 'Currently closed' : 'Scheduled as normal'}</p>
                </div>
                <button
                  onClick={() => onToggleTraining(!trainingCancelled)}
                  className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md ${trainingCancelled ? 'bg-green-500 text-white' : 'bg-emjsc-red text-white'}`}
                >
                  {trainingCancelled ? 'Open' : 'Cancel'}
                </button>
              </div>
              <button onClick={onRefreshTravelTimes} className="w-full bg-slate-50 text-emjsc-navy border border-slate-200 font-black py-3 rounded-2xl uppercase tracking-[0.1em] text-[10px] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Sync Travel Times
              </button>
            </div>

            <MatchEditor
              games={games}
              onUpdate={onManualAssign}
              onSaveGame={onSaveGame}
              onAddGame={onAddGame}
              availabilities={availabilities}
              dutiesConfig={dutiesConfig}
              onDeleteGame={onDeleteGame}
              squad={squad}
            />

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fixture Integration</h3>

              {/* Playwright scraper — fetches logos + map links from Dribl web page */}
              <button
                onClick={onScrapeDribl}
                className="w-full bg-emjsc-navy text-white text-[10px] font-black uppercase py-4 rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3"
              >
                <Zap className="w-4 h-4 text-yellow-300" />
                Scrape Dribl — Sync Fixtures, Logos &amp; Maps
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-300">or paste JSON</span>
                </div>
              </div>

              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                placeholder='Paste fixture JSON here...'
                className="w-full h-40 p-5 bg-slate-50 border border-slate-100 rounded-3xl text-[10px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emjsc-navy resize-none font-mono"
              />
              <button onClick={() => { onBulkSync(bulkJson); setBulkJson(''); }} className="w-full bg-slate-100 text-emjsc-navy text-[10px] font-black uppercase py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-slate-200">
                <RefreshCw className="w-4 h-4" />
                Sync JSON Fixtures
              </button>
              <button
                onClick={() => { if (window.confirm("CRITICAL WARNING: This will PERMANENTLY DELETE the entire match schedule from the database. This cannot be undone. Proceed?")) { onClearSchedule(); } }}
                className="w-full bg-red-100 text-emjsc-red text-[10px] font-black uppercase py-4 rounded-2xl transition-all flex items-center justify-center gap-3 border border-red-200"
              >
                <Trash2 className="w-4 h-4" />
                Wipe Full Schedule
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'moderate' && (
          <motion.div key="moderate" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
            <AdminModeration messages={messages} blocks={blocks} onAdminDeleteMessage={onAdminDeleteMessage} onAdminDeleteBlock={onAdminDeleteBlock} />
          </motion.div>
        )}

        {activeTab === 'duties' && (
          <motion.div key="duties" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
            <div className="bg-emjsc-navy p-6 rounded-[2rem] text-white shadow-lg border-b-4 border-emjsc-red relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Duty Automation</h3>
                  <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => { if (window.confirm("ARE YOU SURE? This will automatically assign duties to all future games based on the rules. This cannot be easily undone.")) { onAutoAllocate(); } }}
                    className="w-full bg-white text-emjsc-navy font-black py-3 rounded-xl uppercase tracking-tighter text-[9px] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Smart Allocate Duties
                  </button>
                  <button
                    onClick={() => { if (window.confirm("ARE YOU SURE? This cannot be undone and will wipe ALL future assignments.")) { onClearDuties(); } }}
                    className="w-full bg-emjsc-red/20 text-white border border-white/20 font-black py-3 rounded-xl uppercase tracking-tighter text-[9px] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Wipe All Assignments
                  </button>
                </div>
              </div>
              <Zap className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12 opacity-10" />
            </div>

            <DutyManager
              duties={dutiesConfig}
              onAdd={onAddDutyConfig}
              onUpdate={onUpdateDutyConfig}
              onDelete={onDeleteDutyConfig}
              coachChild={coachChild}
              onUpdateCoachChild={onUpdateCoachChild}
              coachExemptDuties={coachExemptDuties}
              onUpdateCoachExemptDuties={onUpdateCoachExemptDuties}
              squad={squad}
            />

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Duty Distribution Tally</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Player</th>
                      {dutiesConfig.map((d: any) => (
                        <th key={d.id} className="px-2 py-4 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-center" title={d.label}>
                          {d.label.charAt(0)}
                        </th>
                      ))}
                      <th className="px-4 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {squad.map((player: any) => {
                      const counts: Record<string, number> = {};
                      dutiesConfig.forEach((d: any) => counts[d.id] = 0);
                      games.forEach((g: any) => {
                        if (g.goalie === player.name) counts.goalie = (counts.goalie || 0) + 1;
                        if (g.snackProvider === player.name) counts.snack_provider = (counts.snack_provider || 0) + 1;
                        if (g.pitchMarshal === player.name) counts.pitch_marshal = (counts.pitch_marshal || 0) + 1;
                        if (g.referee === player.name) counts.referee = (counts.referee || 0) + 1;
                        if (g.assignments) {
                          Object.entries(g.assignments).forEach(([dutyId, pName]) => {
                            if (pName === player.name) counts[dutyId] = (counts[dutyId] || 0) + 1;
                          });
                        }
                      });
                      const total = Object.values(counts).reduce((a, b) => a + b, 0);
                      return { name: player.name, counts, total };
                    })
                    .sort((a, b) => b.total - a.total)
                    .map(p => (
                      <tr key={p.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-emjsc-navy rounded-lg flex items-center justify-center text-[9px] font-bold text-white shrink-0">{p.name.charAt(0)}</div>
                            <span className="text-[10px] font-black text-emjsc-navy uppercase truncate">{p.name}</span>
                          </div>
                        </td>
                        {dutiesConfig.map((d: any) => (
                          <td key={d.id} className="px-2 py-3 text-center">
                            <span className="text-[9px] font-bold text-slate-400">{p.counts[d.id]}</span>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-[10px] font-bold text-white bg-emjsc-navy px-2 py-1 rounded-lg flex items-center justify-center w-fit ml-auto">{p.total}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap justify-center gap-4 py-4 border-t border-slate-50 italic">
                {dutiesConfig.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-1.5 opacity-50">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    <span className="text-[7px] font-black uppercase text-slate-400">{d.label.charAt(0)}: {d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'faq' && (
          <motion.div key="faq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <FaqManager
              items={faqItems}
              onAdd={onAddFaqItem}
              onUpdate={onUpdateFaqItem}
              onDelete={onDeleteFaqItem}
              onReset={onResetFaq}
            />
          </motion.div>
        )}

        {activeTab === 'features' && (
          <motion.div key="features" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  Feature Requests ({(featureRequests as any[]).length})
                </h3>
                {newFeatureCount > 0 && (
                  <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{newFeatureCount} new</span>
                )}
              </div>

              {(featureRequests as any[]).length === 0 ? (
                <p className="text-center text-[10px] font-black uppercase text-slate-400 py-8 italic">No feature requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {[...(featureRequests as any[])].sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0)).map((req: any) => (
                    <div key={req.id} className={`p-4 rounded-2xl border space-y-2 ${req.status === 'reviewed' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-black uppercase text-emjsc-navy">{req.submitterName || 'Anonymous'}</span>
                            <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${req.status === 'reviewed' ? 'bg-slate-200 text-slate-500' : 'bg-amber-500 text-white'}`}>{req.status === 'reviewed' ? 'Reviewed' : 'New'}</span>
                            {req.submittedAt && (
                              <span className="text-[8px] text-slate-400 font-bold">
                                {new Date(req.submittedAt.toDate?.() ?? req.submittedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">{req.description}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {req.status !== 'reviewed' && (
                            <button
                              onClick={() => onMarkFeatureReviewed(req.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-[8px] font-black uppercase rounded-xl active:scale-95 transition-all"
                            >
                              <Check className="w-3 h-3" />
                              Done
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteFeatureRequest(req.id)}
                            className="p-1.5 text-emjsc-red hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'squad' && (
          <motion.div key="squad" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Squad & Passwords</h3>
              <SquadManager
                squad={squad}
                onUpdate={onUpdateSquad}
                passwords={passwords}
                onUpdatePasswords={onUpdatePasswords}
                staffAccounts={staffAccounts}
                onUpdateStaff={onUpdateStaff}
                userRole={userRole}
              />
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Configurations</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Team Home Ground</label>
                  <input type="text" defaultValue={homeGround} onBlur={(e) => onUpdateHomeGround(e.target.value)} placeholder="e.g. Central Park, Malvern VIC" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy" />
                  <p className="text-[8px] text-slate-400 italic px-1 font-bold">Used for calculating travel estimates for away games.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Wednesday Training Venue</label>
                  <input type="text" defaultValue={trainingLocation} onBlur={(e) => onUpdateTrainingLocation(e.target.value)} placeholder="e.g. Gardiner Park" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy" />
                </div>
              </div>
              <div className="pt-6 border-t border-slate-50 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                    <MessageCircle className="w-3 h-3" />
                    Squad Messaging System
                  </label>
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-emjsc-navy leading-none">Internal Chat</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">{messagingEnabled ? 'Enabled for all players' : 'Globally Disabled'}</p>
                    </div>
                    <button
                      onClick={() => onUpdateMessagingEnabled(!messagingEnabled)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${messagingEnabled ? 'bg-emjsc-red text-white' : 'bg-green-600 text-white'}`}
                    >
                      {messagingEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  Feature Request Notifications
                </label>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Admin Email</label>
                    <input
                      type="email"
                      defaultValue={notificationSettings.adminEmail || 'jeremymarks@gmail.com'}
                      onBlur={(e) => onUpdateNotificationSettings({ ...notificationSettings, adminEmail: e.target.value })}
                      placeholder="jeremymarks@gmail.com"
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy"
                    />
                    <p className="text-[8px] text-slate-400 italic px-1 font-bold">Receives an email when a new feature is requested.</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <p className="text-[9px] font-black uppercase text-slate-400">EmailJS Config (optional)</p>
                    <p className="text-[8px] text-slate-400 font-medium leading-relaxed">Create a free account at emailjs.com to enable email notifications. Leave blank to skip emails.</p>
                    <input
                      type="text"
                      defaultValue={notificationSettings.emailjsServiceId || ''}
                      onBlur={(e) => onUpdateNotificationSettings({ ...notificationSettings, emailjsServiceId: e.target.value })}
                      placeholder="Service ID (e.g. service_abc123)"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none font-mono"
                    />
                    <input
                      type="text"
                      defaultValue={notificationSettings.emailjsTemplateId || ''}
                      onBlur={(e) => onUpdateNotificationSettings({ ...notificationSettings, emailjsTemplateId: e.target.value })}
                      placeholder="Template ID (e.g. template_xyz789)"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none font-mono"
                    />
                    <input
                      type="text"
                      defaultValue={notificationSettings.emailjsPublicKey || ''}
                      onBlur={(e) => onUpdateNotificationSettings({ ...notificationSettings, emailjsPublicKey: e.target.value })}
                      placeholder="Public Key"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-emjsc-navy outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                  <CalendarDays className="w-3 h-3" />
                  Calendar Subscription Feed
                </label>
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-emjsc-navy leading-none">Live Fixture Feed</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">
                      {calendarUpdatedAt
                        ? `Last pushed ${calendarUpdatedAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} at ${calendarUpdatedAt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} · v${calendarVersion}`
                        : 'Never manually refreshed'}
                    </p>
                  </div>
                  <button
                    onClick={onForceCalendarRefresh}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emjsc-navy hover:bg-emjsc-red text-white transition-all active:scale-95"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Push Update
                  </button>
                </div>
                <p className="text-[8px] text-slate-400 italic px-1 font-bold">Increments the feed version so calendar apps recognise new or updated events on their next sync.</p>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
