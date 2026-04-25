/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar,
  CalendarDays,
  Users,
  MapPin, 
  Utensils, 
  Shield, 
  User as UserIcon, 
  ChevronRight, 
  LogOut, 
  Plus, 
  RefreshCw,
  AlertCircle,
  Settings,
  ArrowLeftRight,
  UserPlus,
  UserCheck,
  UserMinus,
  Zap,
  Car,
  Lock,
  Unlock,
  Check,
  Flag,
  HandMetal,
  Menu,
  X,
  MessageCircle,
  Ban,
  Trash2,
  Upload,
  PlusCircle,
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  Send,
  Lightbulb
} from 'lucide-react';
import { db, FUNCTIONS_BASE, Game as GameType, PlayerFeedback, Message, Block, Announcement, Availability, DutyConfig, FaqItem, FeatureRequest, NotificationSettings, TrainingSession } from './lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, setDoc, doc, writeBatch, serverTimestamp, deleteDoc, getDocs } from 'firebase/firestore';
import { TEAM_SQUAD, CLUB_LOGO, AVATAR_COLORS, SEED_FAQS, splitOpponent, playerAvatar, getNextTrainingDate, getNextSaturday, getTravelTime, getGameMapUrl, formatVenueDisplay, extractDestFromMapUrl } from './lib/constants';
import emailjs from '@emailjs/browser';
import { DesktopNavButton, MobileNavItem, NavTab, NavButton } from './components/Nav';
import { GameCard } from './components/GameCard';
const GameDetailView = React.lazy(() => import('./components/GameDetailView').then(m => ({ default: m.GameDetailView })));
const HelpView = React.lazy(() => import('./components/HelpView').then(m => ({ default: m.HelpView })));
const AdminView = React.lazy(() => import('./components/AdminView').then(m => ({ default: m.AdminView })));
const MessagesView = React.lazy(() => import('./components/MessagesView').then(m => ({ default: m.MessagesView })));

function ChangePasswordForm({ playerName, onSave }: { playerName: string; onSave: (next: string) => Promise<string | null> }) {
  const [open, setOpen] = React.useState(false);
  const [newPw, setNewPw] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const reset = () => { setOpen(false); setNewPw(''); setError(null); setSaved(false); };
  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="text-[9px] font-black uppercase tracking-widest text-slate-400 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-400 transition-all active:scale-95 mt-1">
      Change Password
    </button>
  );
  return (
    <div className="pt-3 border-t border-slate-100 space-y-2">
      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Change Password</p>
      {error && <p className="text-[9px] font-black text-emjsc-red uppercase">{error}</p>}
      {saved && <p className="text-[9px] font-black text-green-600 uppercase">Password updated!</p>}
      <input type="password" placeholder="New password" value={newPw}
        onChange={e => { setNewPw(e.target.value); setError(null); setSaved(false); }}
        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-emjsc-navy" />
      <div className="flex gap-2">
        <button onClick={reset} className="flex-1 py-2 text-[9px] font-black uppercase bg-slate-100 text-slate-500 rounded-xl active:scale-95 transition-all">Cancel</button>
        <button onClick={async () => {
          const err = await onSave(newPw);
          if (err) { setError(err); } else { setSaved(true); setNewPw(''); setTimeout(reset, 1500); }
        }} className="flex-1 py-2 text-[9px] font-black uppercase bg-emjsc-navy text-white rounded-xl active:scale-95 transition-all">Save</button>
      </div>
    </div>
  );
}

export default function App() {
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('teamtrack_user'));
  const [loading, setLoading] = useState(true);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const [games, setGames] = useState<GameType[]>([]);
  const [squad, setSquad] = useState<{ name: string; fact: string }[]>(TEAM_SQUAD);
  const navigate = useNavigate();
  const location = useLocation();
  const PATH_TO_VIEW: Record<string, string> = {
    '/': 'fixtures', '/schedule': 'fixtures', '/squad': 'squad',
    '/admin': 'admin', '/messages': 'messages', '/help': 'help',
  };
  const gameIdFromPath = location.pathname.startsWith('/game/')
    ? location.pathname.slice('/game/'.length)
    : null;
  const view = gameIdFromPath ? 'game' : (PATH_TO_VIEW[location.pathname] ?? 'fixtures');
  const selectedGame = gameIdFromPath ? (games.find(g => g.id === gameIdFromPath) ?? null) : null;
  const setView = (v: string) => {
    const VIEW_TO_PATH: Record<string, string> = {
      fixtures: '/schedule', squad: '/squad', admin: '/admin', messages: '/messages', help: '/help',
    };
    if (v === 'game') return;
    navigate(VIEW_TO_PATH[v] ?? '/schedule');
  };
  const [editingSkills, setEditingSkills] = useState<string | null>(null);
  const DEFAULT_PLAYER_PASSWORDS: Record<string, string> = {
    "Zephyr Y": "ATTITUDE26", "Harry S": "CREATIVE26", "Myles H": "SMILE26",
    "Tanush P": "VISION26", "Joshua M": "SPIRIT26", "Thomas B": "FOCUS26",
    "Benjamin C": "ENERGY26", "Hugo D": "TOUCH26", "Harvey M": "SPEED26", "Julian B": "TEAMWORK26"
  };
  const [passwords, setPasswords] = useState<{ players: Record<string, string>; coach: string; manager: string; staffAccounts?: { id: string; name: string; role: string; password: string }[] }>({
    players: DEFAULT_PLAYER_PASSWORDS, coach: 'admin123', manager: 'admin123'
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('teamtrack_admin') === 'true');
  const [userRole, setUserRole] = useState<string | null>(localStorage.getItem('teamtrack_role'));
  const [adminPass, setAdminPass] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  const [venueFilter, setVenueFilter] = useState<'all' | 'home' | 'away'>('all');
  const [dutyFilter, setDutyFilter] = useState(false);
  const [calendarVersion, setCalendarVersion] = useState(0);
  const [calendarUpdatedAt, setCalendarUpdatedAt] = useState<Date | null>(null);
  const [driblCache, setDriblCache] = useState<import('./components/AdminView').DriblCache | null>(null);
  const [trainingCancelled, setTrainingCancelled] = useState(false);
  const [trainingSchedule, setTrainingSchedule] = useState<TrainingSession[]>([]);
  const [trainingLocation, setTrainingLocation] = useState('Gardiner Park');
  const [homeGround, setHomeGround] = useState('Central Park, Malvern VIC');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState('');
  const [coachChild, setCoachChild] = useState<string | null>(null);
  const [coachExemptDuties, setCoachExemptDuties] = useState<string[]>([]);
  const [messagingEnabled, setMessagingEnabled] = useState(false);
  const [targetPlayerProfile, setTargetPlayerProfile] = useState<string | null>(null);
  const [targetAdminRole, setTargetAdminRole] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, { skills?: string, photoUrl?: string }>>({});
  const [feedbacks, setFeedbacks] = useState<PlayerFeedback[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [dutiesConfig, setDutiesConfig] = useState<DutyConfig[]>([]);
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ adminEmail: 'jeremymarks@gmail.com' });
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureName, setFeatureName] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');
  const [featureSubmitStatus, setFeatureSubmitStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [playerLoginCode, setPlayerLoginCode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null); // gameId-dutyId

  const latestWrappedGame = null;

  useEffect(() => {
    // No more auth listener, just check local storage on mount
    setLoading(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'games'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const g = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameType));
        setGames(g);
        setGamesLoaded(true);
      },
      () => setGamesLoaded(true)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const p: Record<string, any> = {};
      snapshot.forEach(doc => {
        p[doc.id] = doc.data();
      });
      setProfiles(p);
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'training'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTrainingCancelled(data.trainingCancelled);
        setTrainingSchedule(data.trainingSchedule || []);
        setTrainingLocation(data.trainingLocation || 'Gardiner Park');
        setHomeGround(data.homeGround || 'Central Park, Malvern VIC');
        setTeamLogoUrl(data.teamLogoUrl || '');
        setCoachChild(data.coachChild || null);
        setCoachExemptDuties(data.coachExemptDuties || []);
        setMessagingEnabled(data.messagingEnabled !== false);
      }
    });
    return () => unsubscribe();
  }, []);

  const requestUserLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then(result => { if (result.state === 'granted') requestUserLocation(); })
        .catch(() => {});
    } else {
      requestUserLocation();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'calendar'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCalendarVersion(data.version || 0);
        setCalendarUpdatedAt(data.updatedAt?.toDate?.() || null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'driblCache'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setDriblCache({
          fixtures: data.fixtures || [],
          emjscTeams: data.emjscTeams || [],
          selectedTeam: data.selectedTeam || '',
          savedAt: data.savedAt || new Date().toISOString(),
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'feedback'), (snapshot) => {
      const f = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlayerFeedback));
      setFeedbacks(f);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'messages'),
      (snapshot) => {
        const m = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Message))
          .sort((a, b) => (a.timestamp?.toMillis?.() ?? 0) - (b.timestamp?.toMillis?.() ?? 0));
        setMessages(m);
      },
      (err) => console.error('Messages subscription error:', err)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'blocks'), (snapshot) => {
      const b = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Block));
      setBlocks(b);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'announcements'),
      (snapshot) => {
        const a = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Announcement))
          .sort((a, b) => (b.timestamp?.toMillis?.() ?? 0) - (a.timestamp?.toMillis?.() ?? 0));
        setAnnouncements(a);
      },
      (err) => console.error('Announcements subscription error:', err)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'availabilities'), (snapshot) => {
      const a = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Availability));
      setAvailabilities(a);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'dutiesConfig'), (snapshot) => {
      const d = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DutyConfig));
      setDutiesConfig(d);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'faq'),
      (snapshot) => {
        const f = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as FaqItem))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setFaqItems(f);
      },
      (err) => console.error('FAQ subscription error:', err)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'featureRequests'),
      (snapshot) => {
        const r = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FeatureRequest));
        setFeatureRequests(r);
      },
      (err) => console.error('Feature requests subscription error:', err)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'notifications'), (snapshot) => {
      if (snapshot.exists()) {
        setNotificationSettings(snapshot.data() as NotificationSettings);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'passwords'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPasswords(prev => ({
          players: { ...prev.players, ...(data.players || {}) },
          coach: data.coach || prev.coach,
          manager: data.manager || prev.manager,
          staffAccounts: data.staffAccounts !== undefined ? data.staffAccounts : prev.staffAccounts,
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubSquad = onSnapshot(doc(db, 'settings', 'squad'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.members) && data.members.length > 0) {
          setSquad(data.members);
        }
      }
    });
    return () => unsubSquad();
  }, []);

  const updatePasswords = async (next: typeof passwords) => {
    if (!isAdmin) return;
    setPasswords(next);
    await setDoc(doc(db, 'settings', 'passwords'), next);
  };

  const staffAccounts = (passwords.staffAccounts && passwords.staffAccounts.length > 0)
    ? passwords.staffAccounts
    : [
        { id: 'coach_default', name: 'Coach', role: 'coach', password: passwords.coach },
        { id: 'manager_default', name: 'Manager', role: 'manager', password: passwords.manager },
      ];

  const handleUpdateStaff = async (accounts: typeof staffAccounts) => {
    if (!isAdmin) return;
    const next = { ...passwords, staffAccounts: accounts };
    setPasswords(next);
    await setDoc(doc(db, 'settings', 'passwords'), next);
  };

  const handleUpdateSquad = async (members: { name: string; fact: string }[]) => {
    if (!isAdmin) return;
    setSquad(members);
    await setDoc(doc(db, 'settings', 'squad'), { members });
  };

  const updatePlayerPassword = async (playerName: string, newPass: string): Promise<string | null> => {
    if (!newPass.trim()) return 'New password cannot be empty';
    const next = { ...passwords, players: { ...passwords.players, [playerName]: newPass.trim() } };
    setPasswords(next);
    await setDoc(doc(db, 'settings', 'passwords'), next);
    return null;
  };

  const handleAddFaqItem = async (item: Omit<FaqItem, 'id'>) => {
    try {
      const id = `faq_${Date.now()}`;
      setFaqItems(prev => [...prev, { id, ...item } as FaqItem]);
      await setDoc(doc(db, 'faq', id), item);
    } catch (e) { console.error('Add FAQ error:', e); }
  };

  const handleUpdateFaqItem = async (item: FaqItem) => {
    try {
      setFaqItems(prev => prev.map(f => f.id === item.id ? item : f));
      const { id, ...data } = item;
      await setDoc(doc(db, 'faq', id), data);
    } catch (e) { console.error('Update FAQ error:', e); }
  };

  const handleDeleteFaqItem = async (id: string) => {
    try {
      setFaqItems(prev => prev.filter(f => f.id !== id));
      await deleteDoc(doc(db, 'faq', id));
    } catch (e) { console.error('Delete FAQ error:', e); }
  };

  const handleResetFaq = async () => {
    try {
      const batch = writeBatch(db);
      faqItems.forEach(item => batch.delete(doc(db, 'faq', item.id)));
      SEED_FAQS.forEach(({ id, ...data }) => batch.set(doc(db, 'faq', id), data));
      setFaqItems(SEED_FAQS as any[]);
      await batch.commit();
    } catch (e) { console.error('Reset FAQ error:', e); }
  };

  const handleSubmitFeatureRequest = async () => {
    if (!featureDescription.trim()) return;
    setFeatureSubmitStatus('submitting');
    try {
      const id = `fr_${Date.now()}`;
      const data = {
        description: featureDescription.trim(),
        submitterName: featureName.trim() || undefined,
        submittedAt: serverTimestamp(),
        status: 'new' as const,
      };
      await setDoc(doc(db, 'featureRequests', id), data);

      const { adminEmail, emailjsServiceId, emailjsTemplateId, emailjsPublicKey } = notificationSettings;
      if (emailjsServiceId && emailjsTemplateId && emailjsPublicKey && adminEmail) {
        try {
          await emailjs.send(emailjsServiceId, emailjsTemplateId, {
            to_email: adminEmail,
            from_name: featureName.trim() || 'Anonymous',
            message: featureDescription.trim(),
            app_name: 'EMJSC Hub',
          }, emailjsPublicKey);
        } catch (emailErr) {
          console.error('EmailJS send failed (non-fatal):', emailErr);
        }
      }

      setFeatureSubmitStatus('done');
      setFeatureName('');
      setFeatureDescription('');
      setTimeout(() => {
        setShowFeatureModal(false);
        setFeatureSubmitStatus('idle');
      }, 1800);
    } catch (e) {
      console.error('Submit feature request error:', e);
      setFeatureSubmitStatus('error');
      setTimeout(() => setFeatureSubmitStatus('idle'), 3000);
    }
  };

  const handleMarkFeatureReviewed = async (id: string) => {
    try {
      await setDoc(doc(db, 'featureRequests', id), { status: 'reviewed' }, { merge: true });
    } catch (e) {
      console.error('Mark reviewed error:', e);
    }
  };

  const handleDeleteFeatureRequest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'featureRequests', id));
    } catch (e) {
      console.error('Delete feature request error:', e);
    }
  };

  const handleUpdateNotificationSettings = async (settings: NotificationSettings) => {
    if (!isAdmin) return;
    setNotificationSettings(settings);
    try {
      await setDoc(doc(db, 'settings', 'notifications'), settings);
    } catch (e) {
      console.error('Update notification settings error:', e);
    }
  };

  const handleSendMessage = async (receiver: string, content: string) => {
    if (!userName) return;
    try {
      const newMsgRef = doc(collection(db, 'messages'));
      await setDoc(newMsgRef, {
        sender: userName,
        receiver,
        content,
        timestamp: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleMarkRead = async (senderName: string) => {
    if (!userName) return;
    try {
      const unread = messages.filter(m => m.receiver === userName && m.sender === senderName && !m.read);
      if (unread.length === 0) return;
      const batch = writeBatch(db);
      unread.forEach(m => {
        batch.update(doc(db, 'messages', m.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking read:", error);
    }
  };

  const handleBlockUser = async (blockedUserName: string) => {
    if (!userName) return;
    try {
      // Use a consistent ID for the block based on both names so it's idempotent
      const blockId = `${userName.replace(/[^a-zA-Z0-9_]/g, '_')}_${blockedUserName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      await setDoc(doc(db, 'blocks', blockId), {
        blocker: userName,
        blocked: blockedUserName,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  const handleUnblockUser = async (blockedUserName: string) => {
    if (!userName && !isAdmin) return;
    try {
      // Find the block document
      const blockId = `${userName!.replace(/[^a-zA-Z0-9_]/g, '_')}_${blockedUserName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      await deleteDoc(doc(db, 'blocks', blockId));
    } catch(err) {
      console.error("Error unblocking:", err);
    }
  };

  const handleAdminDeleteMessage = async (messageId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleAdminDeleteBlock = async (blockId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'blocks', blockId));
    } catch (error) {
      console.error("Error deleting block:", error);
    }
  };

  const handleAddAnnouncement = async (content: string, type: 'message' | 'goal' | 'player_feedback', targetPlayer?: string) => {
    if (!isAdmin) return;
    try {
      const newRef = doc(collection(db, 'announcements'));
      const data: any = { content, type, timestamp: serverTimestamp() };
      if (targetPlayer) data.targetPlayer = targetPlayer;
      await setDoc(newRef, data);
    } catch (err: any) {
      console.error("Error adding announcement:", err);
      setAdminActionStatus(`Save failed: ${err?.code || err?.message || 'unknown error'}`);
      setTimeout(() => setAdminActionStatus(null), 6000);
    }
  };

  const handleUpdateAnnouncement = async (announcement: Announcement) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'announcements', announcement.id), announcement, { merge: true });
    } catch (error) {
      console.error("Error updating announcement:", error);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (err) {
      console.error("Error deleting announcement:", err);
    }
  };

  const handleAddDutyConfig = async (duty: DutyConfig) => {
    try {
      await setDoc(doc(db, 'dutiesConfig', duty.id), duty);
    } catch (error) {
      console.error("Error adding duty config:", error);
    }
  };

  const handleUpdateDutyConfig = async (duty: DutyConfig) => {
    try {
      const { id, ...data } = duty as any;
      await setDoc(doc(db, 'dutiesConfig', id), { id, ...data });
    } catch (error) {
      console.error("Error updating duty config:", error);
    }
  };

  const handleDeleteDutyConfig = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'dutiesConfig', id));
    } catch (error) {
      console.error("Error deleting duty config:", error);
    }
  };

  const handleUpdateFeedback = async (gameId: string, playerName: string, feedback: string, goals: string) => {
    if (!isAdmin) return;
    try {
      const feedbackId = `${gameId}_${playerName.replace(/\s+/g, '_')}`;
      await setDoc(doc(db, 'feedback', feedbackId), {
        gameId,
        playerName,
        feedback,
        goals,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating feedback:", error);
    }
  };

  const handleToggleAvailability = async (playerName: string, dateKey: string) => {
    const id = `${playerName.replace(/\s+/g, '_')}_${dateKey}`;
    const existing = availabilities.find(a => a.id === id);
    const isNowUnavailable = existing ? !existing.isUnavailable : true;
    
    try {
      await setDoc(doc(db, 'availabilities', id), {
        playerName,
        dateKey,
        isUnavailable: isNowUnavailable,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Automatically flag duties if player becomes unavailable
      if (isNowUnavailable) {
        const affectedGames = games.filter(g => g.date.startsWith(dateKey));
        const batch = writeBatch(db);
        affectedGames.forEach(game => {
          const updates: any = {};
          const currentSwapRequests = { ...(game.swapRequests || {}) };
          let changed = false;
          
          if (game.snackProvider === playerName) { updates.snackSwapRequested = true; currentSwapRequests.snack_provider = true; changed = true; }
          if (game.pitchMarshal === playerName) { updates.marshalSwapRequested = true; currentSwapRequests.pitch_marshal = true; changed = true; }
          if (game.referee === playerName) { updates.refereeSwapRequested = true; currentSwapRequests.referee = true; changed = true; }
          if (game.goalie === playerName) { updates.goalieSwapRequested = true; currentSwapRequests.goalie = true; changed = true; }
          
          if (game.assignments) {
            Object.entries(game.assignments).forEach(([dutyId, pName]) => {
              if (pName === playerName) {
                currentSwapRequests[dutyId] = true;
                changed = true;
              }
            });
          }
          
          if (changed) {
            updates.swapRequests = currentSwapRequests;
            batch.update(doc(db, 'games', game.id), updates);
          }
        });
        await batch.commit();
      } else {
        // Automatically unflag duties if player is available again
        const affectedGames = games.filter(g => g.date.startsWith(dateKey));
        const batch = writeBatch(db);
        affectedGames.forEach(game => {
          const updates: any = {};
          const currentSwapRequests = { ...(game.swapRequests || {}) };
          let changed = false;
          
          if (game.snackProvider === playerName) { updates.snackSwapRequested = false; currentSwapRequests.snack_provider = false; changed = true; }
          if (game.pitchMarshal === playerName) { updates.marshalSwapRequested = false; currentSwapRequests.pitch_marshal = false; changed = true; }
          if (game.referee === playerName) { updates.refereeSwapRequested = false; currentSwapRequests.referee = false; changed = true; }
          if (game.goalie === playerName) { updates.goalieSwapRequested = false; currentSwapRequests.goalie = false; changed = true; }
          
          if (game.assignments) {
            Object.entries(game.assignments).forEach(([dutyId, pName]) => {
              if (pName === playerName) {
                currentSwapRequests[dutyId] = false;
                changed = true;
              }
            });
          }
          
          if (changed) {
            updates.swapRequests = currentSwapRequests;
            batch.update(doc(db, 'games', game.id), updates);
          }
        });
        await batch.commit();
      }
    } catch (error) {
      console.error("Error updating availability/duties:", error);
    }
  };

  const handleLogin = (playerName: string) => {
    const finalCorrectPass = passwords.players[playerName] || 'EMJSC2026';
    
    if (playerLoginCode === finalCorrectPass) {
      localStorage.setItem('teamtrack_user', playerName);
      localStorage.setItem('teamtrack_admin', 'false');
      setUserName(playerName);
      setIsAdmin(false);
      setTargetPlayerProfile(null);
      setPlayerLoginCode('');
      setLoginError(null);
    } else {
      setLoginError("Incorrect password");
    }
  };

  const logOut = () => {
    localStorage.removeItem('teamtrack_user');
    localStorage.removeItem('teamtrack_admin');
    localStorage.removeItem('teamtrack_role');
    setUserName(null);
    setIsAdmin(false);
    setUserRole(null);
  };

  const handleSignUp = async (gameId: string, dutyId: string) => {
    if (!userName) return;
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const syncKey = `${gameId}-${dutyId}`;
    setIsSyncing(syncKey);

    // Dynamic field check
    const assignments = game.assignments || {};
    const swapRequests = game.swapRequests || {};
    
    // assignments map takes priority over legacy fields
    const legacyValue = assignments[dutyId] || (dutyId === 'goalie' ? game.goalie :
                        dutyId === 'snack_provider' ? game.snackProvider :
                        dutyId === 'pitch_marshal' ? game.pitchMarshal :
                        dutyId === 'referee' ? game.referee : null);

    const legacySwap = swapRequests[dutyId] || (dutyId === 'goalie' ? game.goalieSwapRequested :
                       dutyId === 'snack_provider' ? game.snackSwapRequested :
                       dutyId === 'pitch_marshal' ? game.marshalSwapRequested :
                       dutyId === 'referee' ? game.refereeSwapRequested : null);

    try {
      let updates: any = {
        assignments: { ...assignments },
        swapRequests: { ...swapRequests }
      };

      if (legacyValue === userName) {
        if (legacySwap) {
          // Cancel swap
          updates.swapRequests[dutyId] = false;
          // Legacy field cleanup if applicable
          if (dutyId === 'goalie') updates.goalieSwapRequested = false;
          if (dutyId === 'snack_provider') updates.snackSwapRequested = false;
          if (dutyId === 'pitch_marshal') updates.marshalSwapRequested = false;
          if (dutyId === 'referee') updates.refereeSwapRequested = false;
        } else {
          await handleRequestSwap(gameId, dutyId);
          setIsSyncing(null);
          return;
        }
      } else if (legacyValue) {
        if (legacySwap) {
          // Claim a swap
          updates.assignments[dutyId] = userName;
          updates.swapRequests[dutyId] = false;
          if (dutyId === 'goalie') { updates.goalie = userName; updates.goalieSwapRequested = false; }
          if (dutyId === 'snack_provider') { updates.snackProvider = userName; updates.snackSwapRequested = false; }
          if (dutyId === 'pitch_marshal') { updates.pitchMarshal = userName; updates.pitchMarshalSwapRequested = false; }
          if (dutyId === 'referee') { updates.referee = userName; updates.refereeSwapRequested = false; }
        } else {
          setIsSyncing(null);
          return;
        }
      } else {
        // Empty sign up
        updates.assignments[dutyId] = userName;
        if (dutyId === 'goalie') updates.goalie = userName;
        if (dutyId === 'snack_provider') updates.snackProvider = userName;
        if (dutyId === 'pitch_marshal') updates.pitchMarshal = userName;
        if (dutyId === 'referee') updates.referee = userName;
      }

      await updateDoc(doc(db, 'games', gameId), updates);
    } catch (error) {
      console.error("Error updating duty:", error);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleRequestSwap = async (gameId: string, dutyId: string) => {
    const syncKey = `${gameId}-${dutyId}`;
    setIsSyncing(syncKey);
    const game = games.find(g => g.id === gameId);
    if (!game) { setIsSyncing(null); return; }

    const swapRequests = game.swapRequests || {};
    
    try {
      let updates: any = {
        swapRequests: { ...swapRequests, [dutyId]: true }
      };
      
      // Legacy compatibility
      if (dutyId === 'goalie') updates.goalieSwapRequested = true;
      if (dutyId === 'snack_provider') updates.snackSwapRequested = true;
      if (dutyId === 'pitch_marshal') updates.marshalSwapRequested = true;
      if (dutyId === 'referee') updates.refereeSwapRequested = true;

      await updateDoc(doc(db, 'games', gameId), updates);
    } catch (error) {
      console.error("Swap request error:", error);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleAdminLogin = () => {
    const correctPass = passwords.manager || (import.meta as any).env.VITE_ADMIN_PASSWORD || 'admin123';
    if (adminPass === correctPass) {
      setIsAdmin(true);
      localStorage.setItem('teamtrack_admin', 'true');
      setAdminPass('');
      setLoginError(null);
    } else {
      setLoginError('Invalid Administrator Password');
    }
  };

  const [adminActionStatus, setAdminActionStatus] = useState<string | null>(null);

  const autoAllocateDuties = async () => {
    if (!isAdmin) return;
    setAdminActionStatus('Starting Smart Allocation...');
    const batch = writeBatch(db);
    
    // 1. Initialize session-wide duty counts
    const dutyTypeCounts: Record<string, Record<string, number>> = {};
    const totalDutyCounts: Record<string, number> = {};

    dutiesConfig.forEach(d => {
      dutyTypeCounts[d.id] = {};
      squad.forEach(p => {
        dutyTypeCounts[d.id][p.name] = 0;
      });
    });

    squad.forEach(p => {
      totalDutyCounts[p.name] = 0;
    });

    // Populate counts from existing database data
    games.forEach(g => {
      // Check legacy fields
      if (g.goalie) {
        if (dutyTypeCounts.goalie) dutyTypeCounts.goalie[g.goalie] = (dutyTypeCounts.goalie[g.goalie] || 0) + 1;
        totalDutyCounts[g.goalie] = (totalDutyCounts[g.goalie] || 0) + 1;
      }
      if (g.snackProvider) {
        if (dutyTypeCounts.snack_provider) dutyTypeCounts.snack_provider[g.snackProvider] = (dutyTypeCounts.snack_provider[g.snackProvider] || 0) + 1;
        totalDutyCounts[g.snackProvider] = (totalDutyCounts[g.snackProvider] || 0) + 1;
      }
      if (g.pitchMarshal) {
        if (dutyTypeCounts.pitch_marshal) dutyTypeCounts.pitch_marshal[g.pitchMarshal] = (dutyTypeCounts.pitch_marshal[g.pitchMarshal] || 0) + 1;
        totalDutyCounts[g.pitchMarshal] = (totalDutyCounts[g.pitchMarshal] || 0) + 1;
      }
      if (g.referee) {
        if (dutyTypeCounts.referee) dutyTypeCounts.referee[g.referee] = (dutyTypeCounts.referee[g.referee] || 0) + 1;
        totalDutyCounts[g.referee] = (totalDutyCounts[g.referee] || 0) + 1;
      }
      
      // Check dynamic fields
      if (g.assignments) {
        Object.entries(g.assignments as Record<string, string>).forEach(([dutyId, playerName]) => {
          const dId = dutyId as string;
          const pName = playerName as string;
          if (dutyTypeCounts[dId]) {
            dutyTypeCounts[dId][pName] = (dutyTypeCounts[dId][pName] || 0) + 1;
          }
          totalDutyCounts[pName] = (totalDutyCounts[pName] || 0) + 1;
        });
      }
    });

    const getBalancedPlayer = (dutyId: string, excludedInThisGame: string[]) => {
      const candidates = squad.filter(p => {
        const name = p.name;
        const isExcluded = excludedInThisGame.includes(name);
        // COACH CHILD EXEMPTION LOGIC
        const isCoachChild = name === coachChild;
        const isDutyExempt = coachExemptDuties.includes(dutyId);
        const isExempted = isCoachChild && isDutyExempt;
        
        return !isExcluded && !isExempted;
      }).map(p => ({
        name: p.name,
        dutyCount: (dutyTypeCounts[dutyId] && dutyTypeCounts[dutyId][p.name]) || 0,
        totalCount: totalDutyCounts[p.name] || 0
      }));

      if (candidates.length === 0) return null;

      const sorted = candidates.sort((a, b) => {
        if (a.dutyCount !== b.dutyCount) return a.dutyCount - b.dutyCount;
        return a.totalCount - b.totalCount;
      });

      const chosen = sorted[0].name;
      
      if (dutyTypeCounts[dutyId]) dutyTypeCounts[dutyId][chosen]++;
      totalDutyCounts[chosen]++;
      
      return chosen;
    };

    games.forEach(g => {
      const updates: any = {};
      const newAssignments: Record<string, string> = { ...g.assignments };
      let changed = false;
      const alreadyAssignedThisGame: string[] = [];

      // Collect current assignments
      if (g.snackProvider) alreadyAssignedThisGame.push(g.snackProvider);
      if (g.pitchMarshal) alreadyAssignedThisGame.push(g.pitchMarshal);
      if (g.referee) alreadyAssignedThisGame.push(g.referee);
      if (g.goalie) alreadyAssignedThisGame.push(g.goalie);
      Object.values(newAssignments).forEach(p => alreadyAssignedThisGame.push(p));

      // Filter duties based on applicability
      const applicableDuties = dutiesConfig.filter(d => {
        if (d.applicableTo === 'both') return true;
        if (d.applicableTo === 'home' && g.isHome) return true;
        if (d.applicableTo === 'away' && !g.isHome) return true;
        return false;
      });

      applicableDuties.forEach(duty => {
        // Check if assigned in legacy or dynamic
        const isAssigned = (duty.id === 'goalie' && g.goalie) || 
                          (duty.id === 'snack_provider' && g.snackProvider) ||
                          (duty.id === 'pitch_marshal' && g.pitchMarshal) ||
                          (duty.id === 'referee' && g.referee) ||
                          newAssignments[duty.id];

        if (!isAssigned) {
          const player = getBalancedPlayer(duty.id, alreadyAssignedThisGame);
          if (player) {
            newAssignments[duty.id] = player;
            alreadyAssignedThisGame.push(player);
            changed = true;
          }
        }
      });

      if (changed) {
        updates.assignments = newAssignments;
        batch.update(doc(db, 'games', g.id), updates);
      }
    });

    try {
      await batch.commit();
      setAdminActionStatus('Successfully auto-allocated duties');
      setTimeout(() => setAdminActionStatus(null), 3000);
    } catch (error) {
      console.error("Auto-allocate error:", error);
      setAdminActionStatus('Failed to auto-allocate');
    }
  };

  const clearAllDuties = async () => {
    if (!isAdmin) return;
    setAdminActionStatus('Clearing all duties...');
    
    const batch = writeBatch(db);
    games.forEach(g => {
      batch.update(doc(db, 'games', g.id), {
        snackProvider: "",
        pitchMarshal: "",
        referee: "",
        goalie: "",
        snackSwapRequested: false,
        marshalSwapRequested: false,
        refereeSwapRequested: false,
        goalieSwapRequested: false,
        assignments: {},
        swapRequests: {}
      });
    });

    try {
      await batch.commit();
      setAdminActionStatus('Successfully cleared all duties');
      setTimeout(() => setAdminActionStatus(null), 3000);
    } catch (error) {
      console.error("Clear duties error:", error);
      setAdminActionStatus('Failed to clear duties');
    }
  };

  const clearSchedule = async () => {
    if (!isAdmin) return;
    setAdminActionStatus('Wiping schedule...');
    const batch = writeBatch(db);
    games.forEach(g => {
      batch.delete(doc(db, 'games', g.id));
    });
    try {
      await batch.commit();
      setAdminActionStatus('Schedule cleared');
      setTimeout(() => setAdminActionStatus(null), 3000);
    } catch (e: any) {
      console.error('clearSchedule error:', e);
      setAdminActionStatus(`Failed: ${e?.code || e?.message || 'unknown error'}`);
      setTimeout(() => setAdminActionStatus(null), 5000);
    }
  };

  const deleteGame = async (gameId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'games', gameId));
      setAdminActionStatus('Match deleted');
      setTimeout(() => setAdminActionStatus(null), 2000);
      await bumpCalendar();
    } catch (e: any) {
      console.error('deleteGame error:', e);
      setAdminActionStatus(`Failed: ${e?.code || e?.message || 'unknown error'}`);
      setTimeout(() => setAdminActionStatus(null), 5000);
    }
  };

  const addGame = async (opponent: string, date: string, location: string, isHome: boolean) => {
    if (!isAdmin) return;
    const slug = opponent.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().replace(/^_+|_+$/g, '');
    const dateSlug = date.substring(0, 10).replace(/-/g, '');
    const gameId = `${slug}_${dateSlug}`;
    try {
      await setDoc(doc(db, 'games', gameId), { opponent, date, location, isHome });
      await syncTravelTime(gameId, location, date, undefined);
      await bumpCalendar();
    } catch (e: any) {
      console.error('Add game error:', e);
      throw e;
    }
  };

  const updateGame = async (gameId: string, updates: Partial<GameType>) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'games', gameId), updates);

      const game = games.find(g => g.id === gameId);
      if (game) {
        const locationOrDateChanged = updates.location !== undefined || updates.date !== undefined || updates.isHome !== undefined;
        if (locationOrDateChanged) {
          const location = updates.location ?? game.location;
          const date = updates.date ?? game.date;
          const mapUrl = updates.mapUrlOverride ?? game.mapUrlOverride;
          syncTravelTime(gameId, location, date, mapUrl); // fire-and-forget
        }
      }
      await bumpCalendar();
    } catch (error) {
      console.error("Update game error:", error);
    }
  };

  const manualAssign = async (gameId: string, field: string, value: any) => {
    try {
      if (field === 'mapUrlOverride') {
        await updateGame(gameId, { mapUrlOverride: value });
      } else if (field === 'location') {
        await updateGame(gameId, { location: value });
      } else if (field === 'date') {
        await updateGame(gameId, { date: value });
      } else if (field === 'opponent') {
        await updateGame(gameId, { opponent: value });
      } else if (field === 'isHome') {
        await updateGame(gameId, { isHome: value === 'true' || value === true });
      } else if (field === 'kickOff') {
        await updateGame(gameId, { kickOff: value });
      } else {
        // Duty assignment — always write to assignments map, also sync legacy fields
        const game = games.find(g => g.id === gameId);
        if (!game) return;

        const assignments = { ...(game.assignments || {}) };
        const swapRequests = { ...(game.swapRequests || {}) };
        assignments[field] = value;
        swapRequests[field] = false;
        const update: any = { assignments, swapRequests };
        // Keep legacy top-level fields in sync for backward compatibility
        if (field === 'goalie') { update.goalie = value; update.goalieSwapRequested = false; }
        if (field === 'snack_provider') { update.snackProvider = value; update.snackSwapRequested = false; }
        if (field === 'pitch_marshal') { update.pitchMarshal = value; update.marshalSwapRequested = false; }
        if (field === 'referee') { update.referee = value; update.refereeSwapRequested = false; }
        await updateGame(gameId, update);
      }
    } catch (error) {
      console.error("Manual assign error:", error);
    }
  };

  const toggleTraining = async (cancelled: boolean) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'training'), { trainingCancelled: cancelled }, { merge: true });
    } catch (error) {
      console.error("Toggle training error:", error);
    }
  };

  const updateTrainingLocation = async (location: string) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'training'), { trainingLocation: location }, { merge: true });
    } catch (error) {
      console.error("Update training location error:", error);
    }
  };

  const updateTrainingSchedule = async (schedule: TrainingSession[]) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'training'), { trainingSchedule: schedule }, { merge: true });
    } catch (error) {
      console.error("Update training schedule error:", error);
    }
  };

  const bumpCalendar = async () => {
    try {
      await setDoc(doc(db, 'settings', 'calendar'), {
        version: calendarVersion + 1,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('bumpCalendar error:', error);
    }
  };

  const handleForceCalendarRefresh = async () => {
    if (!isAdmin) return;
    await bumpCalendar();
  };

  const updateHomeGround = async (location: string) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'training'), { homeGround: location }, { merge: true });
    } catch (error) {
      console.error("Update home ground error:", error);
    }
  };

  const updateTeamLogoUrl = async (url: string) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'training'), { teamLogoUrl: url }, { merge: true });
    } catch (error) {
      console.error("Update team logo URL error:", error);
    }
  };

  // Silently backfill travel times for upcoming away games missing the value
  useEffect(() => {
    if (!homeGround || !gamesLoaded) return;
    const now = new Date();
    const missing = games.filter(
      g => !g.travelTimeMinutes && g.location && new Date(g.date) > now
    );
    if (missing.length === 0) return;
    missing.forEach((g, i) => {
      setTimeout(() => syncTravelTime(g.id, g.location, g.date, g.mapUrlOverride), i * 600);
    });
  }, [homeGround, gamesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncTravelTime = async (gameId: string, location: string, kickOffDateStr: string, mapUrlOverride?: string) => {
    if (!homeGround) return null;

    const dest = (mapUrlOverride && extractDestFromMapUrl(mapUrlOverride))
      || (location ? location.split(/ Midi| Pitch| Field| Pavilion| Quarter| Half/i)[0].trim() : '');
    if (!dest) return null;

    // Departure = arrival time = 30 min before kick-off
    const departureDate = new Date(new Date(kickOffDateStr).getTime() - 30 * 60000);
    const departureSecs = Math.floor(departureDate.getTime() / 1000);

    try {
      const resp = await fetch(
        `${FUNCTIONS_BASE}/travelTime` +
        `?origin=${encodeURIComponent(homeGround)}` +
        `&destination=${encodeURIComponent(dest)}` +
        `&departureTime=${departureSecs}`
      );
      const data = await resp.json();
      if (data.minutes != null) {
        await updateDoc(doc(db, 'games', gameId), { travelTimeMinutes: data.minutes });
        return data.minutes as number;
      }
    } catch (err) {
      console.error("Auto sync travel error:", err);
    }
    return null;
  };

  const bulkSyncFixtures = async (jsonContent: string | object, overrideTeamName?: string) => {
    if (!isAdmin) return;
    setAdminActionStatus('Syncing fixtures...');
    let syncedCount = 0;
    try {
      let data: any;
      try {
        data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
      } catch {
        throw new Error('Invalid JSON — check the pasted data');
      }

      // Accept data.data, data.fixtures, or a top-level array
      const fixtures: any[] = data.data || data.fixtures || (Array.isArray(data) ? data : []);
      if (!Array.isArray(fixtures) || fixtures.length === 0) {
        const keys = Object.keys(data).join(', ');
        throw new Error(`No fixtures array found. Top-level keys: ${keys || '(empty)'}`);
      }

      const teamName = overrideTeamName || "EMJSC U8 Saturday White";

      for (const f of fixtures) {
        const attrs = f.attributes || f;
        const home_team = attrs.home_team_name || attrs.home_team || "";
        const away_team = attrs.away_team_name || attrs.away_team || "";

        if (!home_team.includes(teamName) && !away_team.includes(teamName)) continue;

        const isHome = home_team.includes(teamName);
        const opponent = isHome ? away_team : home_team;
        const cleanOpponent = opponent.trim();

        // Sanitise round to only allowed ID characters
        const roundRaw = attrs.round || attrs.full_round || syncedCount + 1;
        const round = String(roundRaw)
          .replace(/^round\s*/i, '')
          .replace(/^r/i, '')
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .replace(/^_+|_+$/g, '') || String(syncedCount + 1);

        let dateISO = attrs.date || "";
        let kickOff = attrs.time || "";

        if (dateISO.includes('T') && !kickOff) {
          const d = new Date(dateISO);
          dateISO = d.toISOString().split('.')[0];
          kickOff = d.toLocaleTimeString('en-AU', { hour12: false, hour: '2-digit', minute: '2-digit' });
        } else if (attrs.date && attrs.time) {
          dateISO = `${attrs.date}T${attrs.time}:00`;
          kickOff = attrs.time;
        }

        const venue = attrs.venue || attrs.ground_name || "Unknown Venue";
        const field = attrs.field_name ? ` (${attrs.field_name})` : "";
        const location = (venue + field).substring(0, 999);

        const gameId = `game_round_${round}`;
        const gameData: any = {
          date: dateISO,
          opponent: cleanOpponent,
          location,
          isHome,
          kickOff,
        };

        // Logos and map URL from Playwright scrape
        const opponentLogo = isHome ? (attrs.away_team_logo ?? null) : (attrs.home_team_logo ?? null);
        const homeTeamLogo = isHome ? (attrs.home_team_logo ?? null) : (attrs.away_team_logo ?? null);
        if (opponentLogo) gameData.opponentLogo = opponentLogo;
        if (homeTeamLogo) gameData.homeTeamLogo = homeTeamLogo;
        if (attrs.map_url) gameData.mapUrlOverride = attrs.map_url;

        try {
          await setDoc(doc(db, 'games', gameId), gameData, { merge: true });
          syncedCount++;
          if (homeGround) {
            syncTravelTime(gameId, location, dateISO, attrs.map_url);
          }
        } catch (writeErr: any) {
          console.error(`Failed to write game ${gameId}:`, writeErr);
          throw new Error(`Firestore write failed for round ${round}: ${writeErr?.code || writeErr?.message}`);
        }
      }

      if (syncedCount === 0) {
        setAdminActionStatus(`No games matched team "${teamName}"`);
      } else {
        setAdminActionStatus(`${syncedCount} fixture${syncedCount !== 1 ? 's' : ''} synced`);
      }
      setTimeout(() => setAdminActionStatus(null), 4000);
    } catch (err: any) {
      console.error("Bulk sync error:", err);
      setAdminActionStatus(`Sync failed: ${err?.message || 'unknown error'}`);
      setTimeout(() => setAdminActionStatus(null), 8000);
    }
  };


  const fetchDriblFixtures = async (): Promise<{ fixtures: any[]; debug: any } | null> => {
    if (!isAdmin) return null;
    try {
      const res = await fetch('/api/scrape-dribl');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.error("Scrape error:", err);
      throw err;
    }
  };

  const confirmSyncFixtures = async (fixtures: any[], teamName: string) => {
    await bulkSyncFixtures({ data: fixtures }, teamName);
  };

  const saveDriblCache = async (cache: import('./components/AdminView').DriblCache) => {
    try {
      await setDoc(doc(db, 'settings', 'driblCache'), {
        fixtures: cache.fixtures,
        emjscTeams: cache.emjscTeams,
        selectedTeam: cache.selectedTeam,
        savedAt: cache.savedAt,
      });
    } catch (err) {
      console.error('saveDriblCache error:', err);
    }
  };

  const updateCoachChild = async (name: string) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'training'), { coachChild: name }, { merge: true });
    } catch (error) {
      console.error("Update coach child error:", error);
    }
  };

  const updateCoachExemptDuties = async (duties: string[]) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'training'), { coachExemptDuties: duties }, { merge: true });
    } catch (error) {
      console.error("Error updating coach exemptions:", error);
    }
  };

  const updateMessagingEnabled = async (enabled: boolean) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'training'), { messagingEnabled: enabled }, { merge: true });
    } catch (error) {
      console.error("Update messaging system error:", error);
    }
  };

  const updateProfile = async (skills: string, photoUrl: string) => {
    if (!userName) return;
    try {
      await setDoc(doc(db, 'profiles', userName.replace(/\s+/g, '_')), {
        skills,
        photoUrl,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!userName) {
    return (
      <div className="mobile-container flex flex-col items-center p-8 space-y-8 bg-white min-h-screen relative">
        <div className="absolute top-6 right-6">
          <button
            onClick={() => { setTargetPlayerProfile('ADMIN'); setTargetAdminRole(null); setPlayerLoginCode(''); setLoginError(null); }}
            className="flex items-center gap-1.5 px-3 py-2 text-white bg-emjsc-navy rounded-xl hover:shadow-lg transition-all active:scale-95 shadow-md shadow-blue-900/20"
          >
            <Shield className="w-3.5 h-3.5 text-emjsc-red" />
            <span className="text-[9px] font-black uppercase tracking-widest">Admin</span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-6 mt-12 text-center">
          <img
            src={teamLogoUrl || CLUB_LOGO}
            alt="EMJSC Logo"
            className="w-32 drop-shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-emjsc-navy leading-none uppercase">EMJSC Hub</h1>
            <p className="text-slate-500 text-sm font-bold italic">
              {targetPlayerProfile === 'ADMIN' ? 'Admin sign in' : targetPlayerProfile ? `Enter password for ${targetPlayerProfile}` : 'Select your player to enter'}
            </p>
          </div>
        </div>

        {!targetPlayerProfile ? (
          <div className="w-full px-2 space-y-1.5">
            {squad.map((player) => (
              <button
                key={player.name}
                onClick={() => setTargetPlayerProfile(player.name)}
                className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-emjsc-navy hover:bg-white transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-emjsc-navy rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-emjsc-red shrink-0">
                    {player.name.charAt(0)}
                  </div>
                  <p className="text-sm font-black text-slate-800">{player.name}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emjsc-navy transition-colors shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="w-full space-y-4 max-w-sm">
            <div className="space-y-4">
              {loginError && (
                <div className="bg-red-50 text-red-600 text-[10px] font-black uppercase px-4 py-2 rounded-xl border border-red-100 flex items-center justify-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  {loginError}
                </div>
              )}
              {targetPlayerProfile === 'ADMIN' && (
                <select
                  value={targetAdminRole || ''}
                  onChange={(e) => { setTargetAdminRole(e.target.value || null); setPlayerLoginCode(''); setLoginError(null); }}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emjsc-navy outline-none font-bold text-center text-sm text-emjsc-navy"
                >
                  <option value="">Select user...</option>
                  {staffAccounts.map(account => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              )}
              <input
                type="password"
                placeholder={targetPlayerProfile === 'ADMIN' ? (targetAdminRole ? `Password for ${staffAccounts.find(a => a.id === targetAdminRole)?.name}` : 'Select a user first') : "Enter Player Password"}
                value={playerLoginCode}
                onChange={(e) => setPlayerLoginCode(e.target.value)}
                disabled={targetPlayerProfile === 'ADMIN' && !targetAdminRole}
                autoFocus={targetPlayerProfile !== 'ADMIN'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (targetPlayerProfile === 'ADMIN') {
                      const account = staffAccounts.find(a => a.id === targetAdminRole);
                      if (!account) return;
                      const correctPass = account.password || (import.meta as any).env.VITE_ADMIN_PASSWORD || 'admin123';
                      if (playerLoginCode === correctPass) {
                        setIsAdmin(true);
                        setUserRole(account.role || 'manager');
                        localStorage.setItem('teamtrack_admin', 'true');
                        localStorage.setItem('teamtrack_role', account.role || 'manager');
                        localStorage.setItem('teamtrack_user', account.name);
                        setUserName(account.name);
                        setPlayerLoginCode('');
                        setLoginError(null);
                        setView('fixtures');
                      } else {
                        setLoginError(`Invalid password for ${account.name}`);
                      }
                    } else {
                      handleLogin(targetPlayerProfile);
                    }
                  }
                }}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emjsc-navy outline-none font-bold text-center text-lg disabled:opacity-40"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setTargetPlayerProfile(null); setTargetAdminRole(null); setPlayerLoginCode(''); setLoginError(null); }}
                  className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-transform"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (targetPlayerProfile === 'ADMIN') {
                      const account = staffAccounts.find(a => a.id === targetAdminRole);
                      if (!account) return;
                      const correctPass = account.password || (import.meta as any).env.VITE_ADMIN_PASSWORD || 'admin123';
                      if (playerLoginCode === correctPass) {
                        setIsAdmin(true);
                        setUserRole(account.role || 'manager');
                        localStorage.setItem('teamtrack_admin', 'true');
                        localStorage.setItem('teamtrack_role', account.role || 'manager');
                        localStorage.setItem('teamtrack_user', account.name);
                        setUserName(account.name);
                        setPlayerLoginCode('');
                        setLoginError(null);
                        setView('fixtures');
                      } else {
                        setLoginError(`Invalid password for ${account.name}`);
                      }
                    } else {
                      handleLogin(targetPlayerProfile);
                    }
                  }}
                  disabled={targetPlayerProfile === 'ADMIN' && !targetAdminRole}
                  className="flex-[2] bg-emjsc-navy text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-transform disabled:opacity-40"
                >
                  {targetPlayerProfile === 'ADMIN' ? 'Sign In' : 'Confirm Password'}
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase py-4">
              {targetPlayerProfile === 'ADMIN' ? 'Restricted Access Area' : 'Password required for squad privacy'}
            </p>
          </div>
        )}
        
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] text-center mt-auto pb-4">
          Central Park Malvern • VIC
        </p>
      </div>
    );
  }

  const totalUnreadMessages = messages.filter(m => m.receiver === userName && !m.read).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <AnimatePresence>
        {(() => {
          const cancelledSessions = trainingSchedule.filter(s => s.cancelled);
          const showBanner = cancelledSessions.length > 0 || (trainingSchedule.length === 0 && trainingCancelled);
          if (!showBanner) return null;
          const label = cancelledSessions.length > 0
            ? cancelledSessions.map(s => `${s.day} ${s.time}`).join(' & ') + ' Training Cancelled'
            : 'Training is Cancelled';
          return (
            <motion.div
              key="training-banner"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-600 text-white border-b-4 border-red-800 sticky top-0 z-50 overflow-hidden"
            >
              <div className="py-4 px-6 flex items-center justify-center gap-3 text-center">
                <AlertCircle className="w-5 h-5 shrink-0 animate-bounce" />
                <span className="text-sm font-black uppercase tracking-widest leading-none">{label}</span>
                <AlertCircle className="w-5 h-5 shrink-0 hidden sm:block animate-bounce" />
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <div className="mobile-container relative bg-slate-50 md:flex md:gap-8 md:items-start">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-white border-r border-slate-200 p-6 space-y-8 shadow-sm">
          <button onClick={() => navigate('/schedule')} className="flex items-center gap-3 mb-4 group active:scale-95 transition-transform text-left">
            <img
              src={teamLogoUrl || CLUB_LOGO}
              alt="Logo"
              className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-lg font-black tracking-tight text-emjsc-navy leading-none uppercase">EMJSC Hub</h1>
              <p className="text-[9px] text-emjsc-red uppercase font-black tracking-[0.1em] mt-1">U8 White Saturday</p>
            </div>
          </button>

          <nav className="flex flex-col gap-2">
            <DesktopNavButton active={view === 'fixtures' || view === 'game'} onClick={() => setView('fixtures')} icon={<Calendar className="w-5 h-5" />} label="Schedule" />
            <DesktopNavButton active={view === 'squad'} onClick={() => setView('squad')} icon={<Users className="w-5 h-5" />} label="Squad" />
            {messagingEnabled && (
              <DesktopNavButton active={view === 'messages'} onClick={() => setView('messages')} icon={<MessageCircle className="w-5 h-5" />} label="Messages" badge={totalUnreadMessages} />
            )}
            <DesktopNavButton active={view === 'help'} onClick={() => setView('help')} icon={<HelpCircle className="w-5 h-5" />} label="Help" />
            {isAdmin && <DesktopNavButton active={view === 'admin'} onClick={() => setView('admin')} icon={<Settings className="w-5 h-5" />} label="Admin" />}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-4">
            <button
              onClick={() => setShowFeatureModal(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 transition-all active:scale-[0.98] group"
            >
              <Lightbulb className="w-4 h-4 shrink-0 group-hover:text-amber-600" />
              <div className="text-left min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest leading-none">Submit Feedback or Ideas</p>
                <p className="text-[8px] font-medium text-amber-600/70 leading-none mt-0.5">Got an idea?</p>
              </div>
            </button>
            <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-3">
              <img 
                src={playerAvatar(userName || '')} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
              <div className="overflow-hidden">
                <p className="text-[10px] font-black text-slate-800 truncate">{userName}</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">Parent</p>
              </div>
            </div>
            <button 
              onClick={logOut} 
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-emjsc-red hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
            >
              <LogOut className="w-4 h-4" />
              Switch Player
            </button>
          </div>
        </aside>

        <div className="flex-1 w-full relative">
          {/* Mobile Header (Hidden on Desktop) */}
          <header className="md:hidden bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-[60]">
            <div className="flex items-center justify-between">
              <button onClick={() => navigate('/schedule')} className="flex items-center gap-3 active:scale-95 transition-transform">
                <img
                  src={teamLogoUrl || CLUB_LOGO}
                  alt="Logo"
                  className="w-8 h-8 object-contain"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h1 className="text-sm font-black tracking-tight text-emjsc-navy leading-none uppercase">
                    {view === 'fixtures' ? 'Fixture' : view === 'squad' ? 'Squad' : view === 'admin' ? 'Admin' : view === 'messages' ? 'Messages' : view === 'game' ? 'Match' : 'Hub'}
                  </h1>
                </div>
              </button>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-emjsc-navy hover:bg-slate-50 rounded-xl transition-colors"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-xl p-4 flex flex-col gap-2 z-50"
                >
                  <MobileNavItem active={view === 'fixtures' || view === 'game'} onClick={() => { setView('fixtures'); setMobileMenuOpen(false); }} icon={<Calendar className="w-5 h-5" />} label="Schedule" />
                  <MobileNavItem active={view === 'squad'} onClick={() => { setView('squad'); setMobileMenuOpen(false); }} icon={<Users className="w-5 h-5" />} label="Squad" />
                  {messagingEnabled && (
                    <MobileNavItem active={view === 'messages'} onClick={() => { setView('messages'); setMobileMenuOpen(false); }} icon={<MessageCircle className="w-5 h-5" />} label="Messages" badge={totalUnreadMessages} />
                  )}
                  <MobileNavItem active={view === 'help'} onClick={() => { setView('help'); setMobileMenuOpen(false); }} icon={<HelpCircle className="w-5 h-5" />} label="Help & FAQ" />
                  {isAdmin && <MobileNavItem active={view === 'admin'} onClick={() => { setView('admin'); setMobileMenuOpen(false); }} icon={<Settings className="w-5 h-5" />} label="Admin Hub" />}
                  <div className="border-t border-slate-100 pt-2 mt-1">
                    <button
                      onClick={() => { setShowFeatureModal(true); setMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 transition-all active:scale-[0.98]"
                    >
                      <Lightbulb className="w-4 h-4 shrink-0" />
                      <div className="text-left">
                        <p className="text-[9px] font-black uppercase tracking-widest leading-none">Submit Feedback or Ideas</p>
                        <p className="text-[8px] font-medium text-amber-600/70 leading-none mt-0.5">Got an idea?</p>
                      </div>
                    </button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <img 
                        src={playerAvatar(userName || '')} 
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full border border-emjsc-red bg-white" 
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{userName}</span>
                    </div>
                    <button onClick={logOut} className="text-[10px] font-black text-emjsc-red uppercase flex items-center gap-1">
                      <LogOut className="w-3 h-3" />
                      Switch
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          {/* Desktop Content Header (Hidden on Mobile) */}
          <header className="hidden md:flex flex-col px-8 pt-10 pb-6 gap-2">
            {(() => {
              const crumbs: { label: string; path?: string }[] = [{ label: 'Schedule', path: '/schedule' }];
              if (view === 'squad') crumbs.push({ label: 'Squad' });
              else if (view === 'admin') crumbs.push({ label: 'Admin Hub' });
              else if (view === 'messages') crumbs.push({ label: 'Messages' });
              else if (view === 'help') crumbs.push({ label: 'Help & FAQ' });
              else if (view === 'game' && selectedGame) {
                const { club, team } = splitOpponent(selectedGame.opponent);
                crumbs.push({ label: `Vs ${club || team}` });
              } else {
                crumbs[0] = { label: 'Schedule' };
              }
              const isHome = crumbs.length === 1;
              if (isHome) return null;
              return (
                <nav className="flex items-center gap-1.5">
                  {crumbs.map((crumb, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                      {crumb.path ? (
                        <button onClick={() => navigate(crumb.path!)} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-emjsc-navy transition-colors">
                          {crumb.label}
                        </button>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emjsc-navy">{crumb.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              );
            })()}
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-emjsc-navy uppercase leading-none mb-1">
                {view === 'fixtures' ? 'Match Schedule'
                  : view === 'squad' ? 'The Squad'
                  : view === 'admin' ? 'Admin Hub'
                  : view === 'profile' ? 'My Profile'
                  : view === 'messages' ? 'Messages'
                  : view === 'help' ? 'Help & FAQ'
                  : view === 'game' && selectedGame
                    ? (() => { const { club, team } = splitOpponent(selectedGame.opponent); return `Vs ${club || team}`; })()
                    : 'Match Details'}
              </h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">{userName} • EMJSC U8 Saturday White</p>
            </div>
          </header>

          {/* Content */}
          <main className="px-6 py-4 md:px-8 md:py-0 pb-24 md:pb-12">
            {/* Breadcrumbs — mobile only (desktop shows in header) */}
            {(() => {
              const crumbs: { label: string; path?: string }[] = [{ label: 'Schedule', path: '/schedule' }];
              if (view === 'squad') crumbs.push({ label: 'Squad' });
              else if (view === 'admin') crumbs.push({ label: 'Admin Hub' });
              else if (view === 'messages') crumbs.push({ label: 'Messages' });
              else if (view === 'help') crumbs.push({ label: 'Help & FAQ' });
              else if (view === 'game' && selectedGame) {
                const { club, team } = splitOpponent(selectedGame.opponent);
                crumbs.push({ label: `Vs ${club || team}` });
              } else {
                return null;
              }
              if (crumbs.length < 2) return null;
              return (
                <nav className="md:hidden flex items-center gap-1.5 mb-4 py-1">
                  {crumbs.map((crumb, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                      {crumb.path ? (
                        <button onClick={() => navigate(crumb.path!)} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-emjsc-navy transition-colors active:scale-95">
                          {crumb.label}
                        </button>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emjsc-navy">{crumb.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              );
            })()}
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {view === 'fixtures' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-8 space-y-8">
                      {(() => {
                        const myFeedback = feedbacks.find((f: any) => f.playerName === userName);
                        const hasPersonalNotes = myFeedback && (myFeedback.goals || myFeedback.feedback);
                        if (!hasPersonalNotes) return null;
                        return (
                          <div className="space-y-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-4">Coach Notes for You</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {myFeedback.goals && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="p-5 rounded-[2rem] border-2 bg-orange-50 border-orange-100 text-orange-900 shadow-sm relative overflow-hidden group"
                                >
                                  <div className="relative z-10 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-orange-200 text-orange-700">Your Goals</span>
                                    </div>
                                    <p className="text-sm font-bold leading-relaxed italic uppercase tracking-tight">{myFeedback.goals}</p>
                                  </div>
                                  <Flag className="absolute -bottom-2 -right-2 w-16 h-16 opacity-[0.03] group-hover:scale-110 transition-transform text-orange-900" />
                                </motion.div>
                              )}
                              {myFeedback.feedback && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="p-5 rounded-[2rem] border-2 bg-slate-50 border-slate-200 text-slate-900 shadow-sm relative overflow-hidden group"
                                >
                                  <div className="relative z-10 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-200 text-slate-600">Feedback</span>
                                    </div>
                                    <p className="text-sm font-bold leading-relaxed italic uppercase tracking-tight">"{myFeedback.feedback}"</p>
                                  </div>
                                  <MessageCircle className="absolute -bottom-2 -right-2 w-16 h-16 opacity-[0.03] group-hover:scale-110 transition-transform text-slate-900" />
                                </motion.div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {(() => {
                        const visibleAnn = announcements.filter((ann: Announcement) =>
                          ann.type !== 'player_feedback' ||
                          ann.targetPlayer === userName
                        );
                        if (visibleAnn.length === 0) return null;
                        return (
                          <div className="space-y-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-4">Team Messages & Goals</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {visibleAnn.map((ann: Announcement) => (
                                <motion.div
                                  key={ann.id}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={`p-5 rounded-[2rem] border-2 ${
                                    ann.type === 'goal'
                                      ? 'bg-amber-50 border-amber-100 text-amber-900'
                                      : ann.type === 'player_feedback'
                                      ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
                                      : 'bg-indigo-50 border-indigo-100 text-indigo-900'
                                  } shadow-sm relative overflow-hidden group`}
                                >
                                  <div className="relative z-10 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                                        ann.type === 'goal'
                                          ? 'bg-amber-200 text-amber-700'
                                          : ann.type === 'player_feedback'
                                          ? 'bg-emerald-200 text-emerald-700'
                                          : 'bg-indigo-200 text-indigo-700'
                                      }`}>
                                        {ann.type === 'goal' ? 'Squad Goal' : ann.type === 'player_feedback' ? `Coach → ${ann.targetPlayer}` : 'Message'}
                                      </span>
                                      <span className="text-[11px] font-bold opacity-40 uppercase tracking-tighter">
                                        {ann.timestamp?.toDate ? ann.timestamp.toDate().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'Posted Recently'}
                                      </span>
                                    </div>
                                    <p className="text-sm font-bold leading-relaxed italic uppercase tracking-tight">
                                      {ann.content}
                                    </p>
                                  </div>
                                  <Zap className={`absolute -bottom-2 -right-2 w-16 h-16 opacity-[0.03] group-hover:scale-110 transition-transform ${
                                    ann.type === 'goal' ? 'text-amber-900' : ann.type === 'player_feedback' ? 'text-emerald-900' : 'text-indigo-900'
                                  }`} />
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {(() => {
                        const nextSat = getNextSaturday();
                        const satYear = nextSat.getFullYear();
                        const satMonth = nextSat.getMonth();
                        const satDate = nextSat.getDate();
                        
                        const hasGameOnSat = games.some(g => {
                          const d = new Date(g.date);
                          return d.getFullYear() === satYear && 
                                 d.getMonth() === satMonth && 
                                 d.getDate() === satDate;
                        });
                        
                        if (!hasGameOnSat && games.length > 0) {
                          return (
                            <motion.div 
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-emjsc-red/5 border-2 border-dashed border-emjsc-red/20 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center gap-6"
                            >
                              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-emjsc-red shadow-sm shrink-0 border border-emjsc-red/10">
                                <Shield className="w-8 h-8" />
                              </div>
                              <div className="text-center sm:text-left space-y-1">
                                <h3 className="text-xl font-black text-emjsc-navy uppercase tracking-tight">Rest Day • This Saturday</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none">
                                  No match scheduled for {nextSat.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}
                                </p>
                                <p className="text-[10px] text-emjsc-red font-black uppercase tracking-tighter pt-1 italic opacity-70">Enjoy the weekend off squad!</p>
                              </div>
                            </motion.div>
                          );
                        }
                        return null;
                      })()}

                      {!gamesLoaded && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <div className="w-8 h-8 rounded-full border-4 border-slate-100 border-t-emjsc-red animate-spin" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading next match...</p>
                        </div>
                      )}

                      {(() => {
                        const HOUR_MS = 60 * 60 * 1000;
                        const nextGame = games.find((g: GameType) => now - new Date(g.date).getTime() < 2 * HOUR_MS);
                        const isDimmed = (g: GameType) => now - new Date(g.date).getTime() >= HOUR_MS;
                        const hasUserDuty = (g: GameType) => {
                          if (!userName) return false;
                          if (g.assignments && Object.values(g.assignments as Record<string, string>).includes(userName)) return true;
                          return g.goalie === userName || g.snackProvider === userName || g.pitchMarshal === userName || g.referee === userName;
                        };
                        const fixtureGames = games
                          .filter((g: GameType) => {
                            const kickoff = new Date(g.date).getTime();
                            if (statusFilter === 'upcoming' && kickoff <= now) return false;
                            if (statusFilter === 'completed' && kickoff > now) return false;
                            if (venueFilter === 'home' && !g.isHome) return false;
                            if (venueFilter === 'away' && g.isHome) return false;
                            if (dutyFilter && !hasUserDuty(g)) return false;
                            return true;
                          });
                        const anyFilterActive = statusFilter !== 'all' || venueFilter !== 'all' || dutyFilter;
                        return (
                          <>
                            <div className="flex flex-wrap gap-2">
                              <div className="flex rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                                {(['all', 'upcoming', 'completed'] as const).map(s => (
                                  <button key={s} onClick={() => setStatusFilter(s)}
                                    className={`px-3.5 py-2 text-xs font-black uppercase tracking-widest transition-colors ${statusFilter === s ? 'bg-emjsc-navy text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {s === 'all' ? 'All' : s === 'upcoming' ? 'To Play' : 'Completed'}
                                  </button>
                                ))}
                              </div>
                              <div className="flex rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                                {(['all', 'home', 'away'] as const).map(v => (
                                  <button key={v} onClick={() => setVenueFilter(v)}
                                    className={`px-3.5 py-2 text-xs font-black uppercase tracking-widest transition-colors ${venueFilter === v ? 'bg-emjsc-navy text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {v === 'all' ? 'All Venues' : v}
                                  </button>
                                ))}
                              </div>
                              {userName && !isAdmin && (
                                <button onClick={() => setDutyFilter(f => !f)}
                                  className={`px-3.5 py-2 text-xs font-black uppercase tracking-widest rounded-xl border transition-colors ${dutyFilter ? 'bg-emjsc-red text-white border-emjsc-red' : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-slate-600'}`}>
                                  On Duty
                                </button>
                              )}
                            </div>
                            <section className="space-y-4">
                              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                Match Fixture{anyFilterActive ? ` · ${fixtureGames.length} result${fixtureGames.length !== 1 ? 's' : ''}` : ''}
                              </h2>
                              <div className="flex flex-col gap-4">
                                {!gamesLoaded ? (
                                  <div className="flex flex-col items-center justify-center py-16 gap-3 w-full">
                                    <div className="w-8 h-8 rounded-full border-4 border-slate-100 border-t-emjsc-red animate-spin" />
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading fixtures...</p>
                                  </div>
                                ) : games.length === 0 ? (
                                  <div className="py-20 text-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                      <Calendar className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                      <h3 className="font-bold text-lg">No games scheduled</h3>
                                      <p className="text-slate-500 text-sm">Please contact your coach for more info.</p>
                                    </div>
                                  </div>
                                ) : fixtureGames.length === 0 ? (
                                  <p className="text-xs font-black uppercase tracking-widest text-slate-300 py-8 text-center w-full">No matches</p>
                                ) : (
                                  fixtureGames.map((game: GameType) => {
                                    const isNext = game.id === nextGame?.id;
                                    const card = (
                                      <GameCard
                                        game={game}
                                        userName={userName}
                                        homeGround={homeGround}
                                        feedbacks={feedbacks}
                                        availabilities={availabilities}
                                        dutiesConfig={dutiesConfig}
                                        onSignUp={isDimmed(game) ? undefined : handleSignUp}
                                        onToggleAvailability={isDimmed(game) ? undefined : handleToggleAvailability}
                                        isSyncing={isSyncing}
                                        dimmed={isDimmed(game)}
                                        onClick={() => navigate('/game/' + game.id)}
                                        userCoords={userCoords}
                                        onRequestLocation={requestUserLocation}
                                      />
                                    );
                                    if (!isNext) return <React.Fragment key={game.id}>{card}</React.Fragment>;
                                    return (
                                      <div key={game.id} className="relative mt-3">
                                        <div className="absolute -top-3.5 left-3 z-10 bg-emjsc-navy text-white text-[11px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                                          <Zap className="w-3 h-3" />
                                          Next Match
                                        </div>
                                        <div className="ring-2 ring-emjsc-navy rounded-[1.75rem] shadow-md">
                                          {card}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </section>
                          </>
                        );
                      })()}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                      <section className="space-y-4">
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Weekly Training</h2>
                        {trainingSchedule.length > 0 ? trainingSchedule.map(session => (
                          <div key={session.id} className={`${session.cancelled ? 'bg-slate-200 grayscale' : 'bg-emjsc-navy'} p-6 rounded-3xl shadow-xl border-l-4 ${session.cancelled ? 'border-slate-400' : 'border-emjsc-red'} text-white relative overflow-hidden group transition-all duration-500`}>
                            <div className="relative z-10 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-[10px] font-bold ${session.cancelled ? 'text-slate-600 bg-slate-100' : 'text-emjsc-red bg-white'} px-2 py-1 rounded inline-block uppercase tracking-widest`}>
                                  {session.location}
                                </p>
                                {session.cancelled && (
                                  <span className="text-[10px] bg-red-600 text-white px-2 py-1 rounded font-black uppercase animate-pulse">Cancelled</span>
                                )}
                              </div>
                              <h3 className="text-3xl font-black uppercase leading-none">{session.day} {session.time}</h3>
                              <p className={`text-xs ${session.cancelled ? 'text-slate-500' : 'text-blue-100'} font-medium opacity-80 italic`}>
                                {session.cancelled ? 'Session cancelled this week' : 'Parent led training session'}
                              </p>
                            </div>
                            <Users className="absolute -bottom-4 -right-4 w-28 h-28 text-white opacity-5 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                          </div>
                        )) : (
                          <div className={`${trainingCancelled ? 'bg-slate-200 grayscale' : 'bg-emjsc-navy'} p-6 rounded-3xl shadow-xl border-l-4 ${trainingCancelled ? 'border-slate-400' : 'border-emjsc-red'} text-white relative overflow-hidden group transition-all duration-500`}>
                            <div className="relative z-10 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-[10px] font-bold ${trainingCancelled ? 'text-slate-600 bg-slate-100' : 'text-emjsc-red bg-white'} px-2 py-1 rounded inline-block uppercase tracking-widest`}>
                                  {trainingLocation}
                                </p>
                                <span className={`text-[10px] font-bold ${trainingCancelled ? 'text-slate-500' : 'text-blue-100'} uppercase tracking-tight`}>
                                  {getNextTrainingDate()}
                                </span>
                                {trainingCancelled && (
                                  <span className="text-[10px] bg-red-600 text-white px-2 py-1 rounded font-black uppercase animate-pulse">Cancelled</span>
                                )}
                              </div>
                              <h3 className="text-3xl font-black uppercase leading-none">Wednesday 5 PM</h3>
                              <p className={`text-xs ${trainingCancelled ? 'text-slate-500' : 'text-blue-100'} font-medium opacity-80 italic`}>
                                {trainingCancelled ? 'Session cancelled for this week' : 'Parent led training session'}
                              </p>
                            </div>
                            <Users className="absolute -bottom-4 -right-4 w-28 h-28 text-white opacity-5 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                          </div>
                        )}
                      </section>
                      
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Helpful Links</h4>
                        <div className="space-y-2">
                          <a href="https://emjs.club/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                            <span className="text-[10px] font-black uppercase text-emjsc-navy">EMJSC Website</span>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </a>
                          <a href="https://app.dribl.com/app/open?team=NjkzMzkx&team_name=East%20Malvern%20Junior%20SC%20U08%20MiniRoos%20-%20Joeys%20Mixed%20EMJSC%20U8%20Saturday%20White" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                            <span className="text-[10px] font-black uppercase text-emjsc-navy">Dribl App Team Link</span>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </a>
                          <a href="https://fv.dribl.com/fixtures/?date_range=default&season=nPmrj2rmow&competition=Rxm8RpZLKr&club=3pmvQzZrdv&timezone=Australia%2FMelbourne" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                            <span className="text-[10px] font-black uppercase text-emjsc-navy">FV Fixture Results</span>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </a>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                          <CalendarDays className="w-3.5 h-3.5 text-emjsc-red" />
                          Subscribe to Calendar
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                          Subscribe to a live feed — fixtures and updates sync automatically to your calendar app.
                        </p>
                        <a
                          href="webcal://australia-southeast1-gen-lang-client-0029897959.cloudfunctions.net/fixturesICS"
                          className="w-full flex items-center justify-center gap-2 bg-emjsc-navy hover:bg-emjsc-red text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-2xl active:scale-[0.98] transition-all shadow-md shadow-blue-900/10"
                        >
                          <CalendarDays className="w-3.5 h-3.5" />
                          Subscribe to Calendar
                        </a>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Or open directly in</p>
                          <div className="flex gap-2">
                            <a
                              href="webcal://australia-southeast1-gen-lang-client-0029897959.cloudfunctions.net/fixturesICS"
                              className="flex-1 text-center px-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 transition-all active:scale-[0.98]"
                            >
                              <p className="text-[9px] font-black text-white uppercase tracking-tight leading-none">Apple</p>
                            </a>
                            <a
                              href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent("https://australia-southeast1-gen-lang-client-0029897959.cloudfunctions.net/fixturesICS")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center px-2 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
                            >
                              <p className="text-[9px] font-black text-slate-700 uppercase tracking-tight leading-none">Google</p>
                            </a>
                            <a
                              href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent("https://australia-southeast1-gen-lang-client-0029897959.cloudfunctions.net/fixturesICS")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center px-2 py-2 rounded-xl bg-[#0078D4] hover:bg-[#006cbe] transition-all active:scale-[0.98]"
                            >
                              <p className="text-[9px] font-black text-white uppercase tracking-tight leading-none">Outlook</p>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {view === 'squad' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team Squad • U8 White Saturday</h2>
                      <span className="text-[10px] font-bold text-white bg-emjsc-red px-2 py-1 rounded-full uppercase tracking-tighter shadow-sm">{squad.length} Players</span>
                    </div>

                    {/* Coaches */}
                    {staffAccounts.filter((a: any) => a.role === 'coach').map((account: any) => (
                      <div key={account.id} className="bg-emjsc-navy rounded-3xl p-6 flex items-center gap-5 shadow-lg border-b-4 border-emjsc-red relative overflow-hidden">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 text-3xl select-none">🎽</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-xl font-black text-white tracking-tighter uppercase">{account.name}</p>
                            <span className="text-[8px] font-black uppercase bg-emjsc-red text-white px-1.5 py-0.5 rounded shrink-0">Coach</span>
                          </div>
                          <p className="text-[10px] text-white/60 uppercase font-black tracking-tight italic leading-none mb-2">EMJSC • U8 White Saturday</p>
                          <p className="text-[10px] font-bold text-white/80 leading-relaxed">
                            {account.tagline || 'Runs Wednesday training sessions and leads the team on Saturdays. Building skills, confidence, and a love of the game — one match at a time.'}
                          </p>
                        </div>
                        <div className="absolute -bottom-6 -right-6 text-white/5 text-[120px] select-none pointer-events-none">⚽</div>
                      </div>
                    ))}

                    {/* Players */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {squad.map((player) => {
                        const isMe = player.name === userName;
                        const isEditing = isMe && editingSkills !== null;
                        return (
                          <div key={player.name} className={`bg-white rounded-3xl shadow-sm border p-6 space-y-4 hover:shadow-md transition-shadow group overflow-hidden ${isMe ? 'border-emjsc-red/30 ring-1 ring-emjsc-red/10' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-4">
                              <img
                                src={playerAvatar(player.name)}
                                alt={player.name}
                                className="w-16 h-16 rounded-2xl shrink-0 group-hover:rotate-3 transition-transform"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 flex-wrap">
                                  <p className="text-xl font-black text-slate-800 tracking-tighter uppercase">{player.name}</p>
                                  {isMe && <span className="text-[8px] font-black uppercase bg-emjsc-red text-white px-1.5 py-0.5 rounded shrink-0 mt-1">You</span>}
                                </div>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-tight opacity-60 italic leading-none mt-1">EMJSC • U8 White Saturday</p>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-slate-50 space-y-3">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    autoFocus
                                    value={editingSkills}
                                    onChange={(e) => setEditingSkills(e.target.value)}
                                    placeholder="Describe your skills, favourite position, or what you're working on..."
                                    className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 focus:ring-2 focus:ring-emjsc-navy outline-none resize-none placeholder:text-slate-300"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setEditingSkills(null)}
                                      className="flex-1 py-2 text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 rounded-xl active:scale-95 transition-all"
                                    >Cancel</button>
                                    <button
                                      onClick={async () => { await updateProfile(editingSkills, playerAvatar(userName || '')); setEditingSkills(null); }}
                                      className="flex-1 py-2 text-[9px] font-black uppercase tracking-widest bg-emjsc-navy text-white rounded-xl active:scale-95 transition-all"
                                    >Save</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-start gap-2">
                                    <Shield className="w-4 h-4 text-emjsc-red mt-0.5 shrink-0" />
                                    <span className="text-xs font-bold italic text-slate-600 leading-relaxed uppercase">
                                      "{profiles[player.name.replace(/\s+/g, '_')]?.skills || player.fact}"
                                    </span>
                                  </div>
                                  {isMe && (
                                    <button
                                      onClick={() => setEditingSkills(profiles[player.name.replace(/\s+/g, '_')]?.skills || '')}
                                      className="text-[9px] font-black uppercase tracking-widest text-emjsc-navy border border-emjsc-navy/20 px-3 py-1.5 rounded-lg hover:bg-emjsc-navy hover:text-white transition-all active:scale-95"
                                    >
                                      {profiles[player.name.replace(/\s+/g, '_')]?.skills ? 'Edit Description' : 'Add Description'}
                                    </button>
                                  )}
                                </div>
                              )}

                              {isMe && (
                                <ChangePasswordForm
                                  playerName={player.name}
                                  onSave={(next) => updatePlayerPassword(player.name, next)}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Managers at the end */}
                    {staffAccounts.filter((a: any) => a.role === 'manager').map((account: any) => (
                      <div key={account.id} className="bg-white rounded-3xl p-6 flex items-center gap-5 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="w-16 h-16 rounded-2xl bg-emjsc-navy/10 border border-emjsc-navy/20 flex items-center justify-center shrink-0 text-3xl select-none">📋</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-xl font-black text-emjsc-navy tracking-tighter uppercase">{account.name}</p>
                            <span className="text-[8px] font-black uppercase bg-emjsc-navy text-white px-1.5 py-0.5 rounded shrink-0">Team Manager</span>
                          </div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-tight italic leading-none mb-2">EMJSC • U8 White Saturday</p>
                          <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                            {account.tagline || 'Manages the team hub, coordinates duties and fixtures, and is the first point of contact for any team queries.'}
                          </p>
                        </div>
                      </div>
                    ))}

                    <div className="p-6 bg-slate-100 border border-slate-200 rounded-3xl flex items-start gap-4">
                      <AlertCircle className="w-6 h-6 text-emjsc-red shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm text-emjsc-navy font-black uppercase tracking-wide">Squad Privacy Notice</p>
                        <p className="text-xs text-slate-500 font-bold leading-relaxed uppercase tracking-wide">
                          This sensitive data is for EMJSC U8 White Saturday families only. Please do not share outside the squad.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {view === 'game' && !gamesLoaded && (
                  <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading match…</div>
                )}

                {view === 'game' && gamesLoaded && !selectedGame && (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <p className="text-slate-500 text-sm">Match not found.</p>
                    <button onClick={() => navigate('/schedule')} className="text-xs text-emjsc-navy underline">Back to Schedule</button>
                  </div>
                )}

                {view === 'game' && selectedGame && (
                  <div className="max-w-4xl mx-auto">
                    <Suspense fallback={null}>
                    <GameDetailView
                      game={games.find(g => g.id === selectedGame.id) || selectedGame}
                      user={{ displayName: userName }}
                      homeGround={homeGround}
                      feedbacks={feedbacks}
                      availabilities={availabilities}
                      dutiesConfig={dutiesConfig}
                      onToggleAvailability={handleToggleAvailability}
                      onBack={() => navigate('/schedule')}
                      onSignUp={handleSignUp}
                      onRequestSwap={handleRequestSwap}
                      isSyncing={isSyncing}
                    />
                    </Suspense>
                  </div>
                )}

                {view === 'messages' && (
                  <div className="max-w-4xl mx-auto">
                    <Suspense fallback={null}>
                    <MessagesView
                      userName={userName || ''} 
                      messages={messages} 
                      blocks={blocks} 
                      teamSquad={squad}
                      isAdmin={isAdmin}
                      onSendMessage={handleSendMessage} 
                      onBlockUser={handleBlockUser} 
                      onUnblockUser={handleUnblockUser} 
                      onMarkRead={handleMarkRead}
                    />
                    </Suspense>
                  </div>
                )}

                {view === 'admin' && (
                  <div className="max-w-4xl mx-auto">
                    <Suspense fallback={null}>
                        <AdminView
                          userName={userName}
                          games={games}
                          feedbacks={feedbacks}
                          messages={messages}
                          blocks={blocks}
                          announcements={announcements}
                          onUpdateFeedback={handleUpdateFeedback}
                          onAdminDeleteMessage={handleAdminDeleteMessage}
                          onAdminDeleteBlock={handleAdminDeleteBlock}
                          onAddAnnouncement={handleAddAnnouncement}
                          onDeleteAnnouncement={handleDeleteAnnouncement}
                          isLoggedIn={isAdmin} 
                          password={adminPass}
                          onPasswordChange={setAdminPass}
                          onLogin={handleAdminLogin}
                          loginError={loginError}
                          onAutoAllocate={autoAllocateDuties}
                          onClearDuties={clearAllDuties}
                          onClearSchedule={clearSchedule}
                          onDeleteGame={deleteGame}
                          adminActionStatus={adminActionStatus}
                          onManualAssign={manualAssign}
                          onSaveGame={updateGame}
                          onAddGame={addGame}
                          trainingCancelled={trainingCancelled}
                          onToggleTraining={toggleTraining}
                          trainingSchedule={trainingSchedule}
                          onUpdateTrainingSchedule={updateTrainingSchedule}
                          trainingLocation={trainingLocation}
                          onUpdateTrainingLocation={updateTrainingLocation}
                          homeGround={homeGround}
                          onUpdateHomeGround={updateHomeGround}
                          teamLogoUrl={teamLogoUrl}
                          onUpdateTeamLogoUrl={updateTeamLogoUrl}
                          onBulkSync={bulkSyncFixtures}
                          onFetchDribl={fetchDriblFixtures}
                          onConfirmSync={confirmSyncFixtures}
                          driblCache={driblCache}
                          onSaveDriblCache={saveDriblCache}
                          coachChild={coachChild}
                          onUpdateCoachChild={updateCoachChild}
                          coachExemptDuties={coachExemptDuties}
                          onUpdateCoachExemptDuties={updateCoachExemptDuties}
                          messagingEnabled={messagingEnabled}
                          onUpdateMessagingEnabled={updateMessagingEnabled}
                          dutiesConfig={dutiesConfig}
                          onUpdateDutyConfig={handleUpdateDutyConfig}
                          onAddDutyConfig={handleAddDutyConfig}
                          onDeleteDutyConfig={handleDeleteDutyConfig}
                          onUpdateAnnouncement={handleUpdateAnnouncement}
                          availabilities={availabilities}
                          faqItems={faqItems}
                          onAddFaqItem={handleAddFaqItem}
                          onUpdateFaqItem={handleUpdateFaqItem}
                          onDeleteFaqItem={handleDeleteFaqItem}
                          onResetFaq={handleResetFaq}
                          passwords={passwords}
                          onUpdatePasswords={updatePasswords}
                          squad={squad}
                          onUpdateSquad={handleUpdateSquad}
                          userRole={userRole}
                          staffAccounts={staffAccounts}
                          onUpdateStaff={handleUpdateStaff}
                          featureRequests={featureRequests}
                          onMarkFeatureReviewed={handleMarkFeatureReviewed}
                          onDeleteFeatureRequest={handleDeleteFeatureRequest}
                          notificationSettings={notificationSettings}
                          onUpdateNotificationSettings={handleUpdateNotificationSettings}
                          calendarVersion={calendarVersion}
                          calendarUpdatedAt={calendarUpdatedAt}
                          onForceCalendarRefresh={handleForceCalendarRefresh}
                        />
                    </Suspense>
                  </div>
                )}

                {view === 'help' && (
                  <motion.div
                    key="help"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl mx-auto"
                  >
                    <Suspense fallback={null}>
                      <HelpView faqItems={faqItems} userRole={userRole} isAdmin={isAdmin} />
                    </Suspense>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Feature Request Modal */}
          <AnimatePresence>
            {showFeatureModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
              >
                <div className="absolute inset-0 bg-black/50" onClick={() => { if (featureSubmitStatus !== 'submitting') setShowFeatureModal(false); }} />
                <motion.div
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 60, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-0 sm:mx-4 p-6 space-y-5 shadow-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight text-emjsc-navy leading-none">Submit Feedback or Ideas</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Help us improve the EMJSC Hub</p>
                    </div>
                    <button onClick={() => setShowFeatureModal(false)} className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {featureSubmitStatus === 'done' ? (
                    <div className="py-8 text-center space-y-3">
                      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-7 h-7 text-green-600" />
                      </div>
                      <p className="text-sm font-black uppercase text-emjsc-navy">Thanks for the idea!</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Your request has been logged.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Your First Name (optional)</label>
                        <input
                          type="text"
                          value={featureName}
                          onChange={(e) => setFeatureName(e.target.value)}
                          placeholder="e.g. Sarah"
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-emjsc-navy outline-none focus:ring-2 focus:ring-emjsc-navy"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Describe Your Feature Idea <span className="text-emjsc-red">*</span></label>
                        <textarea
                          rows={4}
                          value={featureDescription}
                          onChange={(e) => setFeatureDescription(e.target.value)}
                          placeholder="Tell us what you'd like to see in the app..."
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emjsc-navy resize-none leading-relaxed"
                        />
                      </div>
                      {featureSubmitStatus === 'error' && (
                        <p className="text-[10px] font-black uppercase text-emjsc-red">Something went wrong. Please try again.</p>
                      )}
                      <button
                        onClick={handleSubmitFeatureRequest}
                        disabled={!featureDescription.trim() || featureSubmitStatus === 'submitting'}
                        className="w-full bg-emjsc-navy text-white text-[10px] font-black uppercase py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {featureSubmitStatus === 'submitting' ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting...</>
                        ) : (
                          <><Send className="w-4 h-4" /> Submit Idea</>
                        )}
                      </button>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Nav (Hidden on Desktop) */}
          <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <NavButton active={view === 'fixtures' || view === 'game'} onClick={() => setView('fixtures')} icon={<Calendar className="w-6 h-6" />} />
            {messagingEnabled && (
              <NavButton active={view === 'messages'} onClick={() => setView('messages')} icon={<MessageCircle className="w-6 h-6" />} badge={totalUnreadMessages} />
            )}
            <NavButton active={view === 'squad'} onClick={() => setView('squad')} icon={<Users className="w-6 h-6" />} />
            <NavButton active={view === 'help'} onClick={() => setView('help')} icon={<HelpCircle className="w-6 h-6" />} />
            {isAdmin && <NavButton active={view === 'admin'} onClick={() => setView('admin')} icon={<Settings className="w-6 h-6" />} />}
          </nav>
        </div>
      </div>
    </div>
  );
}

