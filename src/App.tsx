/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
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
  Download,
  PlusCircle,
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  Send
} from 'lucide-react';
import { db, Game as GameType, PlayerFeedback, Message, Block, Announcement, Availability, DutyConfig, FaqItem } from './lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, setDoc, doc, writeBatch, serverTimestamp, deleteDoc, getDocs } from 'firebase/firestore';
import { TEAM_SQUAD, CLUB_LOGO, AVATAR_COLORS, SEED_FAQS, splitOpponent, playerAvatar, getNextTrainingDate, getNextSaturday, getTravelTime } from './lib/constants';
import { DesktopNavButton, MobileNavItem, NavTab, NavButton } from './components/Nav';
import { GameCard } from './components/GameCard';
import { FaqManager, HelpView } from './components/HelpView';
import { GameDetailView, EmptyState } from './components/GameDetailView';
import { AdminCommunications } from './components/AdminCommunications';
import { AdminModeration } from './components/AdminModeration';
import { MatchEditor } from './components/MatchEditor';
import { DutyManager } from './components/DutyManager';
import { AdminView } from './components/AdminView';
import { ProfileView } from './components/ProfileView';
import { MessagesView } from './components/MessagesView';

let mapsLoader: Promise<void> | null = null;
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (mapsLoader) return mapsLoader;
  if ((window as any).google?.maps?.DistanceMatrixService) {
    mapsLoader = Promise.resolve();
    return mapsLoader;
  }
  mapsLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
  return mapsLoader;
}

export default function App() {
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('teamtrack_user'));
  const [loading, setLoading] = useState(true);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const [games, setGames] = useState<GameType[]>([]);
  const [view, setView] = useState<'fixtures' | 'squad' | 'game' | 'admin' | 'profile' | 'messages' | 'help'>('fixtures');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('teamtrack_admin') === 'true');
  const [adminPass, setAdminPass] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [trainingCancelled, setTrainingCancelled] = useState(false);
  const [trainingLocation, setTrainingLocation] = useState('Gardiner Park');
  const [homeGround, setHomeGround] = useState('Central Park, Malvern VIC');
  const [coachChild, setCoachChild] = useState<string | null>(null);
  const [coachExemptDuties, setCoachExemptDuties] = useState<string[]>([]);
  const [messagingEnabled, setMessagingEnabled] = useState(true);
  const [targetPlayerProfile, setTargetPlayerProfile] = useState<string | null>(null);
  const [targetAdminRole, setTargetAdminRole] = useState<'Team Manager' | 'Coach' | null>(null);
  const [profiles, setProfiles] = useState<Record<string, { skills?: string, photoUrl?: string }>>({});
  const [feedbacks, setFeedbacks] = useState<PlayerFeedback[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [dutiesConfig, setDutiesConfig] = useState<DutyConfig[]>([]);
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
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
        setTrainingLocation(data.trainingLocation || 'Gardiner Park');
        setHomeGround(data.homeGround || 'Central Park, Malvern VIC');
        setCoachChild(data.coachChild || null);
        setCoachExemptDuties(data.coachExemptDuties || []);
        setMessagingEnabled(data.messagingEnabled !== false);
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
    } catch (err) {
      console.error("Error adding announcement:", err);
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

  const handleUpdateMatchWrap = async (gameId: string, message: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'games', gameId), {
        matchWrap: message
      });
    } catch (error) {
      console.error("Error updating match wrap:", error);
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
    const envKey = `VITE_PASS_${playerName.toUpperCase().replace(/\s+/g, '_')}`;
    const metaEnv = (import.meta as any).env;
    const correctPass = metaEnv ? metaEnv[envKey] : null;
    
    // Default fallback if no env var is set, using the fact-based pattern
    const defaultPasswords: Record<string, string> = {
      "Zephyr Y": "ATTITUDE26",
      "Harry S": "CREATIVE26",
      "Myles H": "SMILE26",
      "Tanush P": "VISION26",
      "Joshua M": "SPIRIT26",
      "Thomas B": "FOCUS26",
      "Benjamin C": "ENERGY26",
      "Hugo D": "TOUCH26",
      "Harvey M": "SPEED26",
      "Julian B": "TEAMWORK26"
    };
    
    const finalCorrectPass = correctPass || defaultPasswords[playerName] || 'EMJSC2026';
    
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
    setUserName(null);
    setIsAdmin(false);
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
    
    // Fallback for legacy fields if matches dutyId exactly
    const legacyValue = (dutyId === 'goalie' ? game.goalie : 
                        dutyId === 'snack_provider' ? game.snackProvider : 
                        dutyId === 'pitch_marshal' ? game.pitchMarshal : 
                        dutyId === 'referee' ? game.referee : null) || assignments[dutyId];
    
    const legacySwap = (dutyId === 'goalie' ? game.goalieSwapRequested : 
                       dutyId === 'snack_provider' ? game.snackSwapRequested : 
                       dutyId === 'pitch_marshal' ? game.marshalSwapRequested : 
                       dutyId === 'referee' ? game.refereeSwapRequested : null) || swapRequests[dutyId];

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
    const correctPass = (import.meta as any).env.VITE_ADMIN_PASSWORD || 'admin123';
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
      TEAM_SQUAD.forEach(p => {
        dutyTypeCounts[d.id][p.name] = 0;
      });
    });

    TEAM_SQUAD.forEach(p => {
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
      const candidates = TEAM_SQUAD.filter(p => {
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
      if (!isHome) await syncTravelTime(gameId, location, date);
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
      if (game && (updates.location || updates.date) && !game.isHome) {
        await syncTravelTime(gameId, updates.location || game.location, updates.date || game.date);
      }
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

  const updateHomeGround = async (location: string) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'training'), { homeGround: location }, { merge: true });
    } catch (error) {
      console.error("Update home ground error:", error);
    }
  };

  const syncTravelTime = async (gameId: string, location: string, kickOffDateStr: string) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!homeGround || !location || !apiKey) return null;

    const cleanLocation = location
      .split(/ Midi| Pitch| Field| Pavilion| Quarter| Half/i)[0]
      .trim();

    const departureDate = new Date(new Date(kickOffDateStr).getTime() - 30 * 60000);

    try {
      await loadGoogleMaps(apiKey);
      const service = new (window as any).google.maps.DistanceMatrixService();
      const result = await new Promise<any>((resolve, reject) => {
        service.getDistanceMatrix({
          origins: [homeGround],
          destinations: [cleanLocation],
          travelMode: 'DRIVING',
          drivingOptions: { departureTime: departureDate, trafficModel: 'best_guess' },
        }, (response: any, status: string) => {
          if (status === 'OK') resolve(response);
          else reject(new Error(status));
        });
      });

      const element = result.rows[0].elements[0];
      if (element.status === 'OK') {
        const travelTimeMinutes = Math.ceil(element.duration_in_traffic?.value ?? element.duration.value) / 60;
        await updateDoc(doc(db, 'games', gameId), { travelTimeMinutes });
        return travelTimeMinutes;
      }
    } catch (err) {
      console.error("Auto sync travel error:", err);
    }
    return null;
  };

  const bulkSyncFixtures = async (jsonContent: string | object) => {
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

      const teamName = "EMJSC U8 Saturday White";

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

        try {
          await setDoc(doc(db, 'games', gameId), gameData, { merge: true });
          syncedCount++;
          if (!isHome && homeGround) {
            syncTravelTime(gameId, location, dateISO);
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


  const refreshTravelTimes = async () => {
    if (!isAdmin || !homeGround) return;
    setAdminActionStatus('Syncing unique park travel times...');
    
    try {
      // Create a queue of unique location+time combos to sync
      for (const game of games) {
        if (!game.isHome) {
          // Always refresh if we don't have it, or if it was the default
          await syncTravelTime(game.id, game.location, game.date);
        }
      }
      setAdminActionStatus('All travel times uniquely updated!');
      setTimeout(() => setAdminActionStatus(null), 3000);
    } catch (err) {
      console.error("Refresh travel times error:", err);
      setAdminActionStatus('Failed to update travel times');
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
      await setDoc(doc(db, 'profiles', userName), { 
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
      <div className="mobile-container flex flex-col items-center p-8 space-y-10 bg-white min-h-screen">
        <div className="flex flex-col items-center gap-6 mt-12 text-center">
          <img 
            src={CLUB_LOGO} 
            alt="EMJSC Logo" 
            className="w-32 drop-shadow-2xl" 
            referrerPolicy="no-referrer"
          />
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-emjsc-navy leading-none uppercase">EMJSC Hub</h1>
            <p className="text-slate-500 text-sm font-bold italic">
              {targetPlayerProfile === 'ADMIN' ? `Sign in as ${targetAdminRole || 'Admin'}` : targetPlayerProfile ? `Enter password for ${targetPlayerProfile}` : 'Select your player to enter'}
            </p>
          </div>
        </div>
        
        {!targetPlayerProfile ? (
          <>
            <div className="w-full max-h-[50vh] overflow-y-auto px-2 space-y-3 custom-scrollbar">
              {TEAM_SQUAD.map((player) => (
                <button 
                  key={player.name}
                  onClick={() => setTargetPlayerProfile(player.name)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-emjsc-navy hover:bg-white transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emjsc-navy rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-emjsc-red group-hover:scale-110 transition-transform">
                      {player.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-800">{player.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Active Player</p>
                    </div>
                  </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emjsc-navy transition-colors" />
                </button>
              ))}
            </div>

            <div className="w-full pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Coaches & Management</p>
              <div className="w-full flex gap-2">
                <button
                  onClick={() => { setTargetPlayerProfile('ADMIN'); setTargetAdminRole('Team Manager'); }}
                  className="flex-1 flex items-center justify-center gap-2 p-4 bg-emjsc-navy text-white rounded-2xl hover:shadow-xl transition-all active:scale-[0.98] shadow-lg shadow-blue-900/20"
                >
                  <Shield className="w-4 h-4 text-emjsc-red" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Manager</span>
                </button>
                <button
                  onClick={() => { setTargetPlayerProfile('ADMIN'); setTargetAdminRole('Coach'); }}
                  className="flex-1 flex items-center justify-center gap-2 p-4 bg-slate-700 text-white rounded-2xl hover:shadow-xl transition-all active:scale-[0.98] shadow-lg"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Coach</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full space-y-4 max-w-sm">
            <div className="space-y-4">
              {loginError && (
                <div className="bg-red-50 text-red-600 text-[10px] font-black uppercase px-4 py-2 rounded-xl border border-red-100 flex items-center justify-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  {loginError}
                </div>
              )}
              <input 
                type="password" 
                placeholder={targetPlayerProfile === 'ADMIN' ? `Password for ${targetAdminRole || 'Admin'}` : "Enter Player Password"}
                value={playerLoginCode}
                onChange={(e) => setPlayerLoginCode(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (targetPlayerProfile === 'ADMIN') {
                      const correctPass = (import.meta as any).env.VITE_ADMIN_PASSWORD || 'admin123';
                      const identity = targetAdminRole || 'Team Manager';
                      if (playerLoginCode === correctPass) {
                        setIsAdmin(true);
                        localStorage.setItem('teamtrack_admin', 'true');
                        localStorage.setItem('teamtrack_user', identity);
                        setUserName(identity);
                        setPlayerLoginCode('');
                        setLoginError(null);
                        setView('admin');
                      } else {
                        setLoginError(`Invalid password for ${identity}`);
                      }
                    } else {
                      handleLogin(targetPlayerProfile);
                    }
                  }
                }}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emjsc-navy outline-none font-bold text-center text-lg"
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
                      const correctPass = (import.meta as any).env.VITE_ADMIN_PASSWORD || 'admin123';
                      const identity = targetAdminRole || 'Team Manager';
                      if (playerLoginCode === correctPass) {
                        setIsAdmin(true);
                        localStorage.setItem('teamtrack_admin', 'true');
                        localStorage.setItem('teamtrack_user', identity);
                        setUserName(identity);
                        setPlayerLoginCode('');
                        setLoginError(null);
                        setView('admin');
                      } else {
                        setLoginError(`Invalid password for ${identity}`);
                      }
                    } else {
                      handleLogin(targetPlayerProfile);
                    }
                  }}
                  className="flex-[2] bg-emjsc-navy text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-transform"
                >
                  {targetPlayerProfile === 'ADMIN' ? `Sign in as ${targetAdminRole || 'Admin'}` : 'Confirm Password'}
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
        {trainingCancelled && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-600 text-white border-b-4 border-red-800 sticky top-0 z-50 overflow-hidden"
          >
            <div className="py-4 px-6 flex items-center justify-center gap-3 text-center">
              <AlertCircle className="w-5 h-5 shrink-0 animate-bounce" />
              <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                <span className="text-sm font-black uppercase tracking-widest leading-none">Training is Cancelled</span>
                <span className="text-[10px] bg-white/20 px-2 py-1 rounded font-bold uppercase hidden md:inline-block">
                  {getNextTrainingDate()}
                </span>
              </div>
              <AlertCircle className="w-5 h-5 shrink-0 hidden sm:block animate-bounce" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mobile-container relative bg-slate-50 md:flex md:gap-8 md:items-start">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-white border-r border-slate-200 p-6 space-y-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={CLUB_LOGO} 
              alt="Logo" 
              className="w-10 h-10 object-contain" 
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-lg font-black tracking-tight text-emjsc-navy leading-none uppercase">EMJSC Hub</h1>
              <p className="text-[9px] text-emjsc-red uppercase font-black tracking-[0.1em] mt-1">U8 White Saturday</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <DesktopNavButton active={view === 'fixtures' || view === 'game'} onClick={() => setView('fixtures')} icon={<Calendar className="w-5 h-5" />} label="Schedule" />
            <DesktopNavButton active={view === 'squad'} onClick={() => setView('squad')} icon={<Users className="w-5 h-5" />} label="Squad" />
            <DesktopNavButton active={view === 'profile'} onClick={() => setView('profile')} icon={<UserIcon className="w-5 h-5" />} label="My Profile" />
            {messagingEnabled && (
              <DesktopNavButton active={view === 'messages'} onClick={() => setView('messages')} icon={<MessageCircle className="w-5 h-5" />} label="Messages" badge={totalUnreadMessages} />
            )}
            <DesktopNavButton active={view === 'help'} onClick={() => setView('help')} icon={<HelpCircle className="w-5 h-5" />} label="Help" />
            {isAdmin && <DesktopNavButton active={view === 'admin'} onClick={() => setView('admin')} icon={<Settings className="w-5 h-5" />} label="Admin" />}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-4">
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
              <div className="flex items-center gap-3">
                <img 
                  src={CLUB_LOGO} 
                  alt="Logo" 
                  className="w-8 h-8 object-contain" 
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h1 className="text-sm font-black tracking-tight text-emjsc-navy leading-none uppercase">
                    {view === 'fixtures' ? 'Fixture' : view === 'squad' ? 'Squad' : view === 'admin' ? 'Admin' : view === 'profile' ? 'Profile' : view === 'messages' ? 'Messages' : 'Game'}
                  </h1>
                </div>
              </div>
              
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
                  <MobileNavItem active={view === 'profile'} onClick={() => { setView('profile'); setMobileMenuOpen(false); }} icon={<UserIcon className="w-5 h-5" />} label="My Profile" />
                  {messagingEnabled && (
                    <MobileNavItem active={view === 'messages'} onClick={() => { setView('messages'); setMobileMenuOpen(false); }} icon={<MessageCircle className="w-5 h-5" />} label="Messages" badge={totalUnreadMessages} />
                  )}
                  <MobileNavItem active={view === 'help'} onClick={() => { setView('help'); setMobileMenuOpen(false); }} icon={<HelpCircle className="w-5 h-5" />} label="Help & FAQ" />
                  {isAdmin && <MobileNavItem active={view === 'admin'} onClick={() => { setView('admin'); setMobileMenuOpen(false); }} icon={<Settings className="w-5 h-5" />} label="Admin Hub" />}
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
          <header className="hidden md:flex items-center justify-between px-8 py-10">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-emjsc-navy uppercase leading-none mb-1">
                {view === 'fixtures' ? 'Match Schedule' : view === 'squad' ? 'The Squad' : view === 'admin' ? 'Admin Hub' : view === 'profile' ? 'My Profile' : view === 'messages' ? 'Messages' : 'Game Details'}
              </h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">{userName} • EMJSC U8 Saturday White</p>
            </div>
            {view === 'game' && (
              null
            )}
          </header>

          {/* Content */}
          <main className="px-6 py-4 md:px-8 md:py-0 pb-24 md:pb-12">
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
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Coach Notes for You</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {myFeedback.goals && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="p-5 rounded-[2rem] border-2 bg-orange-50 border-orange-100 text-orange-900 shadow-sm relative overflow-hidden group"
                                >
                                  <div className="relative z-10 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md bg-orange-200 text-orange-700">Your Goals</span>
                                    </div>
                                    <p className="text-xs font-bold leading-relaxed italic uppercase tracking-tight">{myFeedback.goals}</p>
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
                                      <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">Feedback</span>
                                    </div>
                                    <p className="text-xs font-bold leading-relaxed italic uppercase tracking-tight">"{myFeedback.feedback}"</p>
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
                          ann.targetPlayer === userName ||
                          isAdmin
                        );
                        if (visibleAnn.length === 0) return null;
                        return (
                          <div className="space-y-4">
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Team Messages & Goals</h2>
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
                                      <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md ${
                                        ann.type === 'goal'
                                          ? 'bg-amber-200 text-amber-700'
                                          : ann.type === 'player_feedback'
                                          ? 'bg-emerald-200 text-emerald-700'
                                          : 'bg-indigo-200 text-indigo-700'
                                      }`}>
                                        {ann.type === 'goal' ? 'Squad Goal' : ann.type === 'player_feedback' ? `Coach → ${ann.targetPlayer}` : 'Message'}
                                      </span>
                                      <span className="text-[8px] font-bold opacity-40 uppercase tracking-tighter">
                                        {ann.timestamp?.toDate ? ann.timestamp.toDate().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'Posted Recently'}
                                      </span>
                                    </div>
                                    <p className="text-xs font-bold leading-relaxed italic uppercase tracking-tight">
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

                      {gamesLoaded && games.length > 0 && (() => {
                        const HOUR_MS = 60 * 60 * 1000;
                        const activeGames = games.filter(g => now - new Date(g.date).getTime() < 2 * HOUR_MS);
                        const completedGames = games.filter(g => now - new Date(g.date).getTime() >= 2 * HOUR_MS);
                        const isInProgress = (g: GameType) => { const ms = now - new Date(g.date).getTime(); return ms >= HOUR_MS && ms < 2 * HOUR_MS; };

                        if (activeGames.length === 0) return null;
                        const game = activeGames[0];
                        const date = new Date(game.date);
                        const dateKey = game.date.split('T')[0];
                        const isUnavailable = availabilities.some(a => a.playerName === userName && a.dateKey === dateKey && a.isUnavailable);
                        const totalUnavailableCount = availabilities.filter(a => a.dateKey === dateKey && a.isUnavailable).length;

                        // Arrival time is fixed at 30 minutes prior to kick off
                        const arrivalTime = new Date(date.getTime() - 30 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const nextApplicableDuties = (dutiesConfig.length > 0 ? dutiesConfig : [
                          { id: 'goalie', label: 'Goalie', applicableTo: 'both' },
                          { id: 'snack_provider', label: 'Snack', applicableTo: 'both' },
                          { id: 'pitch_marshal', label: 'Marshal', applicableTo: 'home' },
                          { id: 'referee', label: 'Referee', applicableTo: 'home' }
                        ]).filter((d: any) => {
                          if (d.applicableTo === 'both' || !d.applicableTo) return true;
                          if (d.applicableTo === 'home' && game.isHome) return true;
                          if (d.applicableTo === 'away' && !game.isHome) return true;
                          return false;
                        });
                        const getNextAssignee = (d: any) =>
                          (game.assignments?.[d.id]) ||
                          (d.id === 'goalie' ? game.goalie :
                           d.id === 'snack_provider' ? game.snackProvider :
                           d.id === 'pitch_marshal' ? game.pitchMarshal :
                           d.id === 'referee' ? game.referee : null);
                        const isMissingDuties = nextApplicableDuties.some((d: any) => !getNextAssignee(d));
                        const isSwapPending = nextApplicableDuties.some((d: any) =>
                          (game.swapRequests?.[d.id]) ||
                          (d.id === 'goalie' ? game.goalieSwapRequested :
                           d.id === 'snack_provider' ? game.snackSwapRequested :
                           d.id === 'pitch_marshal' ? game.marshalSwapRequested :
                           d.id === 'referee' ? game.refereeSwapRequested : false)
                        );

                        return (
                          <section className="space-y-4">
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Next Match</h2>
                            <div
                              onClick={isInProgress(game) ? undefined : () => { setSelectedGame(game); setView('game'); }}
                              className={`bg-white border-2 border-emjsc-navy rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden group transition-all duration-300 ${isInProgress(game) ? 'opacity-50 grayscale cursor-default' : 'cursor-pointer hover:border-emjsc-red'}`}
                            >
                              <div className="absolute top-0 right-0 bg-emjsc-navy text-white px-6 py-2 rounded-bl-3xl font-black uppercase tracking-tighter text-[9px] shadow-lg group-hover:bg-emjsc-red transition-colors flex items-center gap-2">
                                <Zap className="w-3 h-3" />
                                {isInProgress(game) ? 'In Progress' : 'Upcoming'}
                              </div>
                              <div className="flex flex-col gap-6">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-black bg-emjsc-navy text-white px-2 py-0.5 rounded uppercase tracking-widest">
                                      {game.isHome ? 'Home' : 'Away'}
                                    </span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                      {date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
                                    </span>
                                    {isUnavailable && (
                                      <span className="text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-black uppercase tracking-tighter flex items-center gap-1">
                                        <UserMinus className="w-2.5 h-2.5" />
                                        You're Unavailable
                                      </span>
                                    )}
                                    {totalUnavailableCount > 0 && !isUnavailable && (
                                      <span className="text-[8px] bg-red-50 text-slate-500 px-2 py-0.5 rounded font-black uppercase tracking-tighter flex items-center gap-1">
                                        <Users className="w-2.5 h-2.5" />
                                        {totalUnavailableCount} Player{totalUnavailableCount > 1 ? 's' : ''} Out
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    {(() => { const { club, team } = splitOpponent(game.opponent); return <><h3 className="text-3xl sm:text-4xl font-black text-emjsc-navy tracking-tight leading-none uppercase italic">vs {team}</h3>{club && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{club}</p>}</>; })()}
                                    <a
                                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(game.location)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-tighter hover:text-emjsc-red transition-colors w-fit group/loc"
                                    >
                                      <MapPin className="w-3.5 h-3.5 text-emjsc-red" />
                                      <span className="line-clamp-1">{game.location}</span>
                                    </a>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleToggleAvailability(userName, dateKey); }}
                                      className="flex items-center gap-1.5 active:scale-95 transition-all mt-2.5"
                                    >
                                      <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${isUnavailable ? 'bg-red-400' : 'bg-green-400'}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${isUnavailable ? 'left-4' : 'left-0.5'}`} />
                                      </div>
                                      <span className={`text-[9px] font-black uppercase ${isUnavailable ? 'text-red-600' : 'text-green-700'}`}>
                                        {isUnavailable ? 'Unavailable to Play' : 'Available to Play'}
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Kick Off</p>
                                    <p className="text-sm font-black text-emjsc-navy uppercase">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Arrival</p>
                                    <p className="text-sm font-black text-emjsc-red uppercase">{arrivalTime}</p>
                                  </div>
                                </div>

                                <div className="border-t border-slate-100 pt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Duties</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`w-2 h-2 rounded-full ${isSwapPending ? 'bg-orange-500 animate-pulse' : isMissingDuties ? 'bg-red-500' : 'bg-green-500'}`} />
                                      <p className={`text-[9px] font-black uppercase tracking-tight ${isSwapPending ? 'text-orange-600' : isMissingDuties ? 'text-emjsc-red' : 'text-green-600'}`}>
                                        {isSwapPending ? 'Swap Needed' : isMissingDuties ? 'Help Wanted' : 'All Ready'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {nextApplicableDuties.map((duty: any) => {
                                      const assignee = getNextAssignee(duty);
                                      const swap = (game.swapRequests && game.swapRequests[duty.id]) ||
                                        (duty.id === 'goalie' ? game.goalieSwapRequested : duty.id === 'snack_provider' ? game.snackSwapRequested : duty.id === 'pitch_marshal' ? game.marshalSwapRequested : duty.id === 'referee' ? game.refereeSwapRequested : false);
                                      const isMe = assignee === userName;
                                      const syncing = isSyncing === `${game.id}-${duty.id}`;
                                      const takenByOther = !isMe && !!assignee && !swap;
              const blocked = !isMe && (takenByOther || isUnavailable);
                                      return (
                                        <button
                                          key={duty.id}
                                          onClick={() => handleSignUp(game.id, duty.id)}
                                          disabled={syncing || blocked}
                                          className={`px-2.5 py-1.5 rounded-lg border transition-all ${
                                            isMe
                                              ? swap ? 'bg-orange-50 border-orange-300 hover:bg-orange-100 active:scale-95' : 'bg-red-50 border-emjsc-red hover:bg-red-100 active:scale-95'

                                              : swap
                                                ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-300'
                                                : takenByOther
                                                  ? 'bg-white border-slate-200 cursor-not-allowed'
                                                  : isUnavailable
                                                    ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                                                    : 'bg-white border-slate-200 hover:border-emjsc-navy active:scale-95'
                                          } ${syncing ? 'opacity-70 cursor-wait' : ''}`}
                                        >
                                          <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0 truncate">{duty.emoji && <span className="mr-0.5">{duty.emoji}</span>}{duty.label}</p>
                                          <p className={`text-[9px] font-black uppercase truncate ${
                                            isMe ? (swap ? 'text-orange-600' : 'text-emjsc-red')
                                              : swap ? 'text-orange-600'
                                              : takenByOther ? 'text-slate-500'
                                              : isUnavailable ? 'text-slate-300'
                                              : 'text-emjsc-navy'
                                          }`}>
                                            {syncing ? '...' : isMe ? (swap ? 'Cancel' : <span className="flex items-center gap-0.5">{(([f,...r])=>f+(r[0]?' '+r[0][0]:''))(assignee!.split(' '))}<ArrowLeftRight className="w-2.5 h-2.5 shrink-0" /></span>) : swap ? 'Take It' : assignee ? (([f,...r])=>f+(r[0]?' '+r[0][0]:''))(assignee.split(' ')) : isUnavailable ? 'N/A' : 'Claim'}
                                          </p>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {!game.isHome && game.travelTimeMinutes && (
                                  <div className="flex items-center gap-1 text-[9px] font-black text-emjsc-red uppercase tracking-widest bg-red-50 px-3 py-2 rounded-xl w-fit">
                                    <Zap className="w-3 h-3" />
                                    Est. {game.travelTimeMinutes} min travel from {homeGround || 'Central Park'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </section>
                        );
                      })()}

                      {(() => {
                        const HOUR_MS = 60 * 60 * 1000;
                        const activeGames = games.filter((g: GameType) => now - new Date(g.date).getTime() < 2 * HOUR_MS);
                        const completedGames = games.filter((g: GameType) => now - new Date(g.date).getTime() >= 2 * HOUR_MS);
                        const isInProgress = (g: GameType) => { const ms = now - new Date(g.date).getTime(); return ms >= HOUR_MS && ms < 2 * HOUR_MS; };
                        const upcomingFixtures = activeGames.slice(1);
                        return (
                          <>
                            <section className="space-y-4">
                              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Match Fixture</h2>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                                {!gamesLoaded ? (
                                  <div className="flex flex-col items-center justify-center py-16 gap-3 col-span-full">
                                    <div className="w-8 h-8 rounded-full border-4 border-slate-100 border-t-emjsc-red animate-spin" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading fixtures...</p>
                                  </div>
                                ) : games.length === 0 ? (
                                  <EmptyState />
                                ) : upcomingFixtures.length === 0 ? null : (
                                  upcomingFixtures.map((game: GameType) => (
                                    <GameCard
                                      key={game.id}
                                      game={game}
                                      userName={userName}
                                      homeGround={homeGround}
                                      feedbacks={feedbacks}
                                      availabilities={availabilities}
                                      dutiesConfig={dutiesConfig}
                                      onSignUp={handleSignUp}
                                      onToggleAvailability={handleToggleAvailability}
                                      isSyncing={isSyncing}
                                      dimmed={isInProgress(game)}
                                      onClick={() => { setSelectedGame(game); setView('game'); }}
                                    />
                                  ))
                                )}
                              </div>
                            </section>
                            {completedGames.length > 0 && (
                              <section className="space-y-4">
                                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Completed Games</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                                  {completedGames.map((game: GameType) => (
                                    <GameCard
                                      key={game.id}
                                      game={game}
                                      userName={userName}
                                      homeGround={homeGround}
                                      feedbacks={feedbacks}
                                      availabilities={availabilities}
                                      dutiesConfig={dutiesConfig}
                                      dimmed
                                    />
                                  ))}
                                </div>
                              </section>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                      <section className="space-y-4">
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Weekly Training</h2>
                        <div className={`${trainingCancelled ? 'bg-slate-200 grayscale' : 'bg-emjsc-navy'} p-6 rounded-3xl shadow-xl border-l-4 ${trainingCancelled ? 'border-slate-400' : 'border-emjsc-red'} text-white relative overflow-hidden group transition-all duration-500`}>
                          <div className="relative z-10 space-y-2">
                            <div className="flex items-center gap-2 text-wrap">
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
                    </div>
                  </div>
                )}

                {view === 'squad' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team Squad • U8 White Saturday</h2>
                      <span className="text-[10px] font-bold text-white bg-emjsc-red px-2 py-1 rounded-full uppercase tracking-tighter shadow-sm">10 Players Squad</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {TEAM_SQUAD.map((player) => (
                        <div key={player.name} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4 hover:shadow-md transition-shadow group overflow-hidden">
                          <div className="flex items-center gap-4">
                            <img
                              src={playerAvatar(player.name)}
                              alt={player.name}
                              className="w-16 h-16 rounded-2xl shrink-0 group-hover:rotate-3 transition-transform"
                            />
                            <div>
                              <p className="text-xl font-black text-slate-800 tracking-tighter uppercase">{player.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-tight text-emjsc-navy opacity-60 italic leading-none mt-1">EMJSC • U8 White Saturday</p>
                            </div>
                          </div>
                          
                          <div className="pt-4 border-t border-slate-50 space-y-3">
                            <div className="flex items-start gap-2">
                              <Shield className="w-4 h-4 text-emjsc-red mt-0.5 shrink-0" />
                              <span className="text-xs font-bold italic text-slate-600 leading-relaxed uppercase">"{player.fact}"</span>
                            </div>
                            {profiles[player.name]?.skills && (
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Coach's Scouting Report:</p>
                                <p className="text-[10px] font-bold text-slate-600 leading-normal">{profiles[player.name]?.skills}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
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

                {view === 'game' && selectedGame && (
                  <div className="max-w-4xl mx-auto">
                    <GameDetailView 
                      game={games.find(g => g.id === selectedGame.id) || selectedGame} 
                      user={{ displayName: userName }}
                      homeGround={homeGround}
                      feedbacks={feedbacks}
                      availabilities={availabilities}
                      onToggleAvailability={handleToggleAvailability}
                      onBack={() => setView('fixtures')} 
                      onSignUp={handleSignUp}
                      onRequestSwap={handleRequestSwap}
                      isSyncing={isSyncing}
                    />
                  </div>
                )}

                {view === 'profile' && (
                  <div className="max-w-2xl mx-auto">
                    <ProfileView 
                      userName={userName || ''} 
                      profiles={profiles} 
                      feedbacks={feedbacks}
                      games={games}
                      onUpdateProfile={updateProfile} 
                    />
                  </div>
                )}

                {view === 'messages' && (
                  <div className="max-w-4xl mx-auto">
                    <MessagesView 
                      userName={userName || ''} 
                      messages={messages} 
                      blocks={blocks} 
                      teamSquad={TEAM_SQUAD}
                      isAdmin={isAdmin}
                      onSendMessage={handleSendMessage} 
                      onBlockUser={handleBlockUser} 
                      onUnblockUser={handleUnblockUser} 
                      onMarkRead={handleMarkRead}
                    />
                  </div>
                )}

                {view === 'admin' && (
                  <div className="max-w-4xl mx-auto">
                        <AdminView 
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
                          trainingLocation={trainingLocation}
                          onUpdateTrainingLocation={updateTrainingLocation}
                          homeGround={homeGround}
                          onUpdateHomeGround={updateHomeGround}
                          onRefreshTravelTimes={refreshTravelTimes}
                          onBulkSync={bulkSyncFixtures}
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
                        />
                  </div>
                )}

                {view === 'help' && (
                  <motion.div
                    key="help"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl mx-auto"
                  >
                    <HelpView faqItems={faqItems} />
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>

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

