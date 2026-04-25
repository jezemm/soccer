import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Shield, Users, Utensils, MessageCircle, Settings,
  HelpCircle, Lock, Unlock, AlertCircle, Trash2, RefreshCw, Zap
} from 'lucide-react';
import { TEAM_SQUAD } from '../lib/constants';
import { AdminCommunications } from './AdminCommunications';
import { AdminModeration } from './AdminModeration';
import { MatchEditor } from './MatchEditor';
import { DutyManager } from './DutyManager';
import { FaqManager } from './HelpView';

function AdminDutySelector({ label, value, onSelect }: any) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-50">
      <span className="text-[10px] font-black uppercase text-slate-400">{label}</span>
      <select
        value={value || ""}
        onChange={(e) => onSelect(e.target.value)}
        className="text-[10px] font-black text-emjsc-navy uppercase bg-slate-50 p-2 rounded-lg border-none focus:ring-1 focus:ring-emjsc-navy outline-none"
      >
        <option value="">(Empty)</option>
        {TEAM_SQUAD.map(p => (
          <option key={p.name} value={p.name}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}

export function AdminView({
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
  onResetFaq
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

  const tabs = [
    { id: 'matches', label: 'Match Day', icon: <Calendar className="w-3 h-3" /> },
    { id: 'content', label: 'Coach Wrap', icon: <MessageCircle className="w-3 h-3" /> },
    ...(messagingEnabled ? [{ id: 'moderate', label: 'Moderation', icon: <Shield className="w-3 h-3" /> }] : []),
    { id: 'duties', label: 'Duty Manager', icon: <Utensils className="w-3 h-3" /> },
    { id: 'faq', label: 'FAQ', icon: <HelpCircle className="w-3 h-3" /> },
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
            />

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fixture Integration</h3>
              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                placeholder='Paste fixture JSON here...'
                className="w-full h-40 p-5 bg-slate-50 border border-slate-100 rounded-3xl text-[10px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emjsc-navy resize-none font-mono"
              />
              <button onClick={() => { onBulkSync(bulkJson); setBulkJson(''); }} className="w-full bg-emjsc-navy text-white text-[10px] font-black uppercase py-4 rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3">
                <RefreshCw className="w-4 h-4" />
                Sync New Fixtures
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
                    {TEAM_SQUAD.map(player => {
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
