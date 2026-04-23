/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
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
  Download
} from 'lucide-react';
import { db, Game as GameType, PlayerFeedback, Message, Block, Announcement, Availability, DutyConfig } from './lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, setDoc, doc, writeBatch, serverTimestamp, deleteDoc } from 'firebase/firestore';

const TEAM_SQUAD = [
  { name: "Zephyr Y", fact: "Incredible team player with a never-give-up attitude" },
  { name: "Harry S", fact: "Super creative on the ball and always encouraging others" },
  { name: "Myles H", fact: "Lightning fast and plays with a massive smile on his face" },
  { name: "Tanush P", fact: "Fantastic vision and always looking to help his teammates" },
  { name: "Joshua M", fact: "Determined, skillful, and has a great sporting spirit" },
  { name: "Thomas B", fact: "Shows amazing focus and top-tier footwork every week" },
  { name: "Benjamin C", fact: "A burst of positive energy and incredibly skillful in tight spaces" },
  { name: "Hugo D", fact: "Always hardworking with a brilliant touch on the ball" },
  { name: "Harvey M", fact: "Brilliant speed and a fantastic attitude toward learning" },
  { name: "Julian B", fact: "Highly skillful and always displays great teamwork" }
];

const CLUB_LOGO = "https://emjs.club/vic/sjsc/uploads/images/emjsc%20logo%20svg%20jp.svg";

const getNextTrainingDate = () => {
  const now = new Date();
  const day = now.getDay();
  // Target Wednesday (3)
  const diff = (3 - day + 7) % 7;
  const nextWed = new Date(now);
  nextWed.setDate(now.getDate() + (diff === 0 ? 0 : diff));
  return nextWed.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
};

const getNextSaturday = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = (6 - day + 7) % 7;
  const nextSat = new Date(now);
  nextSat.setDate(now.getDate() + (diff === 0 ? 0 : diff));
  nextSat.setHours(0, 0, 0, 0);
  return nextSat;
};

const getTravelTime = (location: string) => {
  const loc = location.toLowerCase();
  if (loc.includes('gardiner')) return "4 mins";
  if (loc.includes('central park')) return "0 mins";
  if (loc.includes('ashburton')) return "8 mins";
  if (loc.includes('box hill')) return "18 mins";
  if (loc.includes('caulfield')) return "12 mins";
  if (loc.includes('brighton')) return "22 mins";
  if (loc.includes('mordialloc')) return "32 mins";
  if (loc.includes('mentone')) return "28 mins";
  if (loc.includes('cheltenham')) return "25 mins";
  if (loc.includes('hampton')) return "24 mins";
  if (loc.includes('elwood')) return "20 mins";
  if (loc.includes('st kilda')) return "18 mins";
  return "15-25 mins"; // Fallback
};

export default function App() {
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('teamtrack_user'));
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<GameType[]>([]);
  const [view, setView] = useState<'fixtures' | 'squad' | 'game' | 'duties' | 'admin' | 'profile' | 'messages'>('fixtures');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('teamtrack_admin') === 'true');
  const [adminPass, setAdminPass] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [trainingCancelled, setTrainingCancelled] = useState(false);
  const [trainingLocation, setTrainingLocation] = useState('Gardiner Park');
  const [homeGround, setHomeGround] = useState('Central Park, Malvern VIC');
  const [coachChild, setCoachChild] = useState<string | null>(null);
  const [coachExemptDuties, setCoachExemptDuties] = useState<string[]>([]);
  const [messagingEnabled, setMessagingEnabled] = useState(true);
  const [targetPlayerProfile, setTargetPlayerProfile] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, { skills?: string, photoUrl?: string }>>({});
  const [feedbacks, setFeedbacks] = useState<PlayerFeedback[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [dutiesConfig, setDutiesConfig] = useState<DutyConfig[]>([]);
  const [playerLoginCode, setPlayerLoginCode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null); // gameId-dutyId

  const latestWrappedGame = null;

  useEffect(() => {
    // No more auth listener, just check local storage on mount
    setLoading(false);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'games'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const g = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameType));
      setGames(g);
    });
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
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const m = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(m);
    });
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
    const q = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const a = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      setAnnouncements(a);
    });
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

  const handleAddAnnouncement = async (content: string, type: 'message' | 'goal') => {
    if (!isAdmin) return;
    try {
      const newRef = doc(collection(db, 'announcements'));
      await setDoc(newRef, {
        content,
        type,
        timestamp: serverTimestamp()
      });
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
      await setDoc(doc(db, 'dutiesConfig', duty.id), duty, { merge: true });
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
          // Claim
          updates.assignments[dutyId] = userName;
          updates.swapRequests[dutyId] = false;
          // Legacy field sync
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
    if (!window.confirm("ARE YOU SURE? This will automatically assign duties for all future games and overwrite existing specific assignments. This action cannot be undone.")) return;
    
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
    if (!window.confirm("DANGER: This will WIPE ALL assignments from ALL future games. This cannot be undone. Proceed?")) return;
    
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
    const batch = writeBatch(db);
    games.forEach(g => {
      batch.delete(doc(db, 'games', g.id));
    });
    try {
      await batch.commit();
      setAdminActionStatus('Schedule cleared successfully');
      setTimeout(() => setAdminActionStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setAdminActionStatus('Failed to clear schedule');
    }
  };

  const deleteGame = async (gameId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'games', gameId));
      setAdminActionStatus('Match removed');
      setTimeout(() => setAdminActionStatus(null), 2000);
    } catch (e) {
      console.error(e);
      setAdminActionStatus('Failed to delete match');
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
        // Check if it's a dynamic duty or legacy
        const game = games.find(g => g.id === gameId);
        if (!game) return;

        const isLegacy = ['goalie', 'snackProvider', 'pitchMarshal', 'referee'].includes(field);
        
        if (isLegacy) {
          const swapField = field === 'snackProvider' ? 'snackSwapRequested' : 
                           field === 'pitchMarshal' ? 'marshalSwapRequested' : 
                           field === 'referee' ? 'refereeSwapRequested' :
                           'goalieSwapRequested';
          await updateGame(gameId, { 
            [field]: value,
            [swapField]: false 
          } as any);
        } else {
          // Dynamic duty
          const assignments = { ...(game.assignments || {}) };
          const swapRequests = { ...(game.swapRequests || {}) };
          assignments[field] = value;
          swapRequests[field] = false;
          await updateGame(gameId, { assignments, swapRequests });
        }
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
    if (!homeGround || !location) return;
    
    // Clean location to just the Park/Reserve name for better Google Maps accuracy
    const cleanLocation = location
      .split(/ Midi| Pitch| Field| Pavilion| Quarter| Half/i)[0]
      .trim();

    // Calculate arrival time (30 mins before kick off) for traffic estimation
    const kickOffDate = new Date(kickOffDateStr);
    const arrivalDate = new Date(kickOffDate.getTime() - 30 * 60000);
    const arrivalTimeIso = arrivalDate.toISOString();

    try {
      const response = await fetch('/api/travel-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: homeGround,
          destination: cleanLocation,
          arrivalTime: arrivalTimeIso
        })
      });
      const data = await response.json();
      if (data.travelTimeMinutes) {
        await updateDoc(doc(db, 'games', gameId), { travelTimeMinutes: data.travelTimeMinutes });
        return data.travelTimeMinutes;
      }
    } catch (err) {
      console.error("Auto sync travel error:", err);
    }
    return null;
  };

  const bulkSyncFixtures = async (jsonContent: string) => {
    if (!isAdmin) return;
    setAdminActionStatus('Syncing fixtures...');
    try {
      const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
      const teamName = "EMJSC U8 Saturday White";
      
      const fixtures = data.data || data.fixtures || [];
      if (!Array.isArray(fixtures)) throw new Error("Invalid fixtures data");

      for (const f of fixtures) {
        const attrs = f.attributes || f;
        const home_team = attrs.home_team_name || attrs.home_team || "";
        const away_team = attrs.away_team_name || attrs.away_team || "";
        
        if (!home_team.includes(teamName) && !away_team.includes(teamName)) continue;

        const isHome = home_team.includes(teamName);
        const opponent = isHome ? away_team : home_team;
        const cleanOpponent = opponent.split(' - ').pop() || opponent;
        
        const roundRaw = attrs.round || attrs.full_round || "0";
        const round = String(roundRaw).replace(/^R/, '');
        
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
        const location = venue + field;

        const gameId = `game_round_${round}`;
        const gameData: any = {
          date: dateISO,
          opponent: cleanOpponent,
          location: location,
          isHome: isHome,
          kickOff: kickOff,
        };

        await setDoc(doc(db, 'games', gameId), gameData, { merge: true });
        
        if (!isHome && homeGround) {
          syncTravelTime(gameId, location, dateISO);
        }
      }
      setAdminActionStatus('Fixtures synced successfully!');
      setTimeout(() => setAdminActionStatus(null), 3000);
    } catch (err) {
      console.error("Bulk sync error:", err);
      setAdminActionStatus('Failed to sync fixtures (Invalid Data)');
      setTimeout(() => setAdminActionStatus(null), 5000);
    }
  };

  const handleSyncDribl = async () => {
    if (!isAdmin) return;
    setAdminActionStatus('Fetching from Dribl...');
    try {
      const response = await axios.get('/api/sync-fixtures', {
        params: {
          season: 'nPmrj2rmow',
          club: '3pmvQzZrdv',
          tenant: 'w8zdBWPmBX'
        }
      });
      
      if (response.data) {
        await bulkSyncFixtures(response.data);
      }
    } catch (error: any) {
      console.error("Dribl sync error:", error);
      setAdminActionStatus('Dribl API Fetch Failed');
      setTimeout(() => setAdminActionStatus(null), 5000);
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
              {targetPlayerProfile ? `Enter password for ${targetPlayerProfile}` : 'Select your player to enter'}
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
              <button 
                  onClick={() => setTargetPlayerProfile('ADMIN')}
                  className="w-full flex items-center justify-center gap-3 p-5 bg-emjsc-navy text-white rounded-2xl hover:bg-emjsc-navy underline-offset-4 hover:shadow-xl transition-all group active:scale-[0.98] shadow-lg shadow-blue-900/20"
                >
                  <Shield className="w-5 h-5 text-emjsc-red group-hover:animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Team Manager Login</span>
              </button>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic leading-none">Restricted to Coaches & Management</p>
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
                placeholder={targetPlayerProfile === 'ADMIN' ? "Admin Password" : "Enter Player Password"} 
                value={playerLoginCode}
                onChange={(e) => setPlayerLoginCode(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (targetPlayerProfile === 'ADMIN') {
                      const correctPass = (import.meta as any).env.VITE_ADMIN_PASSWORD || 'admin123';
                      if (playerLoginCode === correctPass) {
                        setIsAdmin(true);
                        localStorage.setItem('teamtrack_admin', 'true');
                        localStorage.setItem('teamtrack_user', 'Administrator');
                        setUserName('Administrator');
                        setPlayerLoginCode('');
                        setLoginError(null);
                        setView('admin');
                      } else {
                        setLoginError('Invalid Administrator Password');
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
                  onClick={() => { setTargetPlayerProfile(null); setPlayerLoginCode(''); setLoginError(null); }}
                  className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-transform"
                >
                  Back
                </button>
                <button 
                  onClick={() => {
                    if (targetPlayerProfile === 'ADMIN') {
                      // We need to set adminPass before calling handleAdminLogin
                      // but state updates are async. However, handleAdminLogin can be updated to accept password or use local variable.
                      // For now, let's just make it work.
                      const correctPass = (import.meta as any).env.VITE_ADMIN_PASSWORD || 'admin123';
                      if (playerLoginCode === correctPass) {
                        setIsAdmin(true);
                        localStorage.setItem('teamtrack_admin', 'true');
                        localStorage.setItem('teamtrack_user', 'Administrator');
                        setUserName('Administrator');
                        setPlayerLoginCode('');
                        setLoginError(null);
                        setView('admin');
                      } else {
                        setLoginError('Invalid Administrator Password');
                      }
                    } else {
                      handleLogin(targetPlayerProfile);
                    }
                  }}
                  className="flex-[2] bg-emjsc-navy text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-transform"
                >
                  {targetPlayerProfile === 'ADMIN' ? 'Login as Admin' : 'Confirm Password'}
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
            <DesktopNavButton active={view === 'duties'} onClick={() => setView('duties')} icon={<Shield className="w-5 h-5" />} label="Duties" />
            <DesktopNavButton active={view === 'squad'} onClick={() => setView('squad')} icon={<Users className="w-5 h-5" />} label="Squad" />
            <DesktopNavButton active={view === 'profile'} onClick={() => setView('profile')} icon={<UserIcon className="w-5 h-5" />} label="My Profile" />
            {messagingEnabled && (
              <DesktopNavButton active={view === 'messages'} onClick={() => setView('messages')} icon={<MessageCircle className="w-5 h-5" />} label="Messages" badge={totalUnreadMessages} />
            )}
            {isAdmin && <DesktopNavButton active={view === 'admin'} onClick={() => setView('admin')} icon={<Settings className="w-5 h-5" />} label="Admin" />}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-4">
            <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-3">
              <img 
                src={`https://picsum.photos/seed/${userName?.replace(/\s+/g, '_')}_soccer/100`} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full border border-emjsc-red bg-white" 
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
                    {view === 'fixtures' ? 'Fixture' : view === 'squad' ? 'Squad' : view === 'duties' ? 'Duties' : view === 'admin' ? 'Admin' : view === 'profile' ? 'Profile' : view === 'messages' ? 'Messages' : 'Game'}
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
                  <MobileNavItem active={view === 'duties'} onClick={() => { setView('duties'); setMobileMenuOpen(false); }} icon={<Shield className="w-5 h-5" />} label="Duties" />
                  <MobileNavItem active={view === 'squad'} onClick={() => { setView('squad'); setMobileMenuOpen(false); }} icon={<Users className="w-5 h-5" />} label="Squad" />
                  <MobileNavItem active={view === 'profile'} onClick={() => { setView('profile'); setMobileMenuOpen(false); }} icon={<UserIcon className="w-5 h-5" />} label="My Profile" />
                  {messagingEnabled && (
                    <MobileNavItem active={view === 'messages'} onClick={() => { setView('messages'); setMobileMenuOpen(false); }} icon={<MessageCircle className="w-5 h-5" />} label="Messages" badge={totalUnreadMessages} />
                  )}
                  {isAdmin && <MobileNavItem active={view === 'admin'} onClick={() => { setView('admin'); setMobileMenuOpen(false); }} icon={<Settings className="w-5 h-5" />} label="Admin Hub" />}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <img 
                        src={`https://picsum.photos/seed/${userName?.replace(/\s+/g, '_')}_soccer/100`} 
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
                {view === 'fixtures' ? 'Match Schedule' : view === 'squad' ? 'The Squad' : view === 'duties' ? 'Duty Tracker' : view === 'admin' ? 'Admin Hub' : view === 'profile' ? 'My Profile' : view === 'messages' ? 'Messages' : 'Game Details'}
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
                      {announcements.length > 0 && (
                        <div className="space-y-4">
                          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Team Messages & Goals</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {announcements.map((ann) => (
                              <motion.div
                                key={ann.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`p-5 rounded-[2rem] border-2 ${
                                  ann.type === 'goal' 
                                    ? 'bg-amber-50 border-amber-100 text-amber-900' 
                                    : 'bg-indigo-50 border-indigo-100 text-indigo-900'
                                } shadow-sm relative overflow-hidden group`}
                              >
                                <div className="relative z-10 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md ${
                                        ann.type === 'goal' ? 'bg-amber-200 text-amber-700' : 'bg-indigo-200 text-indigo-700'
                                      }`}>
                                        {ann.type === 'goal' ? 'Squad Goal' : 'Message'}
                                      </span>
                                    </div>
                                    <span className="text-[8px] font-bold opacity-40 uppercase tracking-tighter">
                                      {ann.timestamp?.toDate ? ann.timestamp.toDate().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'Posted Recently'}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold leading-relaxed italic uppercase tracking-tight">
                                    {ann.content}
                                  </p>
                                </div>
                                <Zap className={`absolute -bottom-2 -right-2 w-16 h-16 opacity-[0.03] group-hover:scale-110 transition-transform ${
                                  ann.type === 'goal' ? 'text-amber-900' : 'text-indigo-900'
                                }`} />
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

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

                      {games.length > 0 && (() => {
                        const game = games[0];
                        const date = new Date(game.date);
                        const dateKey = game.date.split('T')[0];
                        const isUnavailable = availabilities.some(a => a.playerName === userName && a.dateKey === dateKey && a.isUnavailable);
                        const totalUnavailableCount = availabilities.filter(a => a.dateKey === dateKey && a.isUnavailable).length;

                        // Arrival time is fixed at 30 minutes prior to kick off
                        const arrivalTime = new Date(date.getTime() - 30 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const isMissingDuties = !game.snackProvider || (game.isHome && (!game.pitchMarshal || !game.referee)) || !game.goalie;
                        const isSwapPending = game.snackSwapRequested || game.marshalSwapRequested || game.refereeSwapRequested || game.goalieSwapRequested;
                        const coachNotes = feedbacks.some(f => f.gameId === game.id);

                        return (
                          <section className="space-y-4">
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Next Match</h2>
                            <div 
                              onClick={() => { setSelectedGame(game); setView('game'); }}
                              className="bg-white border-2 border-emjsc-navy rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden group cursor-pointer hover:border-emjsc-red transition-all duration-300"
                            >
                              <div className="absolute top-0 right-0 bg-emjsc-navy text-white px-6 py-2 rounded-bl-3xl font-black uppercase tracking-tighter text-[9px] shadow-lg group-hover:bg-emjsc-red transition-colors flex items-center gap-2">
                                <Zap className="w-3 h-3" />
                                Upcoming
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
                                    {coachNotes && (
                                      <span className="text-[8px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-black uppercase tracking-tighter flex items-center gap-1">
                                        <MessageCircle className="w-2.5 h-2.5" />
                                        Coach Notes
                                      </span>
                                    )}
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
                                    <h3 className="text-3xl sm:text-4xl font-black text-emjsc-navy tracking-tight leading-none uppercase italic">
                                      vs {game.opponent}
                                    </h3>
                                    <p className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-tighter">
                                      <MapPin className="w-3.5 h-3.5 text-emjsc-red" />
                                      <span className="line-clamp-1">{game.location}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-50 pt-4">
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Kick Off</p>
                                    <p className="text-sm font-black text-emjsc-navy uppercase">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Arrival</p>
                                    <p className="text-sm font-black text-emjsc-red uppercase">{arrivalTime}</p>
                                  </div>
                                  <div className="col-span-2 sm:col-span-1 space-y-0.5">
                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Duties Status</p>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`w-2 h-2 rounded-full ${isSwapPending ? 'bg-orange-500 animate-pulse' : isMissingDuties ? 'bg-red-500' : 'bg-green-500'}`} />
                                      <p className={`text-[10px] font-black uppercase tracking-tight ${isSwapPending ? 'text-orange-600' : isMissingDuties ? 'text-emjsc-red' : 'text-green-600'}`}>
                                        {isSwapPending ? 'Swap Needed' : isMissingDuties ? 'Help Wanted' : 'All Ready'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t border-slate-50 pt-4">
                                  <div className="flex flex-wrap gap-4">
                                    {(dutiesConfig.length > 0 ? dutiesConfig : [
                                      { id: 'goalie', label: 'Goalie' },
                                      { id: 'snack_provider', label: 'Snack' },
                                      { id: 'pitch_marshal', label: 'Marshal' },
                                      { id: 'referee', label: 'Ref' }
                                    ]).filter((d: any) => {
                                      if (d.applicableTo === 'both') return true;
                                      if (d.applicableTo === 'home' && game.isHome) return true;
                                      if (d.applicableTo === 'away' && !game.isHome) return true;
                                      return false;
                                    }).slice(0, 4).map((duty: any) => {
                                      const assignee = (game.assignments && game.assignments[duty.id]) || (duty.id === 'goalie' ? game.goalie : duty.id === 'snack_provider' ? game.snackProvider : duty.id === 'pitch_marshal' ? game.pitchMarshal : duty.id === 'referee' ? game.referee : null);
                                      const icon = duty.id === 'snack_provider' ? <Utensils className="w-3.5 h-3.5 text-slate-400" /> :
                                                   duty.id === 'pitch_marshal' ? <Shield className="w-3.5 h-3.5 text-slate-400" /> :
                                                   duty.id === 'referee' ? <Flag className="w-3.5 h-3.5 text-slate-400" /> :
                                                   <HandMetal className="w-3.5 h-3.5 text-slate-400" />;
                                      
                                      return (
                                        <div key={duty.id} className="flex items-center gap-2 min-w-[80px]">
                                          <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 border border-slate-100">
                                            {icon}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">{duty.label}</p>
                                            <p className={`text-[10px] font-bold uppercase truncate ${assignee ? 'text-emjsc-navy' : 'text-emjsc-red italic'}`}>
                                              {assignee || 'TBA'}
                                            </p>
                                          </div>
                                        </div>
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

                      <section className="space-y-4">
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Match Fixture</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                          {games.length === 0 ? (
                            <EmptyState />
                          ) : (
                            games.slice(1).map((game) => (
                              <GameCard 
                                key={game.id} 
                                game={game} 
                                userName={userName}
                                homeGround={homeGround}
                                feedbacks={feedbacks}
                                availabilities={availabilities}
                                dutiesConfig={dutiesConfig}
                                onClick={() => { setSelectedGame(game); setView('game'); }} 
                              />
                            ))
                          )}
                        </div>
                      </section>
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
                            <div className="w-16 h-16 bg-emjsc-navy rounded-2xl flex items-center justify-center text-xl font-black text-white border-2 border-emjsc-red group-hover:rotate-3 transition-transform overflow-hidden shrink-0 relative">
                              <img 
                                src={`https://picsum.photos/seed/${player.name.replace(/\s+/g, '_')}_soccer/400`} 
                                alt={player.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
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

                {view === 'duties' && (
                  <DutySummaryView 
                    games={games} 
                    userName={userName || ''} 
                    onSignUp={handleSignUp} 
                    isSyncing={isSyncing}
                    dutiesConfig={dutiesConfig}
                    availabilities={availabilities}
                    onToggleAvailability={handleToggleAvailability}
                  />
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
                          trainingCancelled={trainingCancelled}
                          onToggleTraining={toggleTraining}
                          trainingLocation={trainingLocation}
                          onUpdateTrainingLocation={updateTrainingLocation}
                          homeGround={homeGround}
                          onUpdateHomeGround={updateHomeGround}
                          onRefreshTravelTimes={refreshTravelTimes}
                          onBulkSync={bulkSyncFixtures}
                          onSyncDribl={handleSyncDribl}
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
                        />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Bottom Nav (Hidden on Desktop) */}
          <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <NavButton active={view === 'fixtures' || view === 'game'} onClick={() => setView('fixtures')} icon={<Calendar className="w-6 h-6" />} />
            <NavButton active={view === 'duties'} onClick={() => setView('duties')} icon={<Shield className="w-6 h-6" />} />
            {messagingEnabled && (
              <NavButton active={view === 'messages'} onClick={() => setView('messages')} icon={<MessageCircle className="w-6 h-6" />} badge={totalUnreadMessages} />
            )}
            <NavButton active={view === 'squad'} onClick={() => setView('squad')} icon={<Users className="w-6 h-6" />} />
            {isAdmin && <NavButton active={view === 'admin'} onClick={() => setView('admin')} icon={<Settings className="w-6 h-6" />} />}
          </nav>
        </div>
      </div>
    </div>
  );
}

function DesktopNavButton({ active, onClick, icon, label, badge }: any) {
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

function MobileNavItem({ active, onClick, icon, label, badge }: any) {
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

function NavTab({ active, onClick, icon, label }: any) {
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

function NavButton({ active, onClick, icon, badge }: any) {
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

function GameCard({ game, onClick, userName, homeGround, feedbacks = [], availabilities = [], dutiesConfig = [] }: any) {
  const date = new Date(game.date);
  const dateKey = game.date.split('T')[0];
  const isUnavailable = availabilities.some((a: any) => a.playerName === userName && a.dateKey === dateKey && a.isUnavailable);
  const totalUnavailable = availabilities.filter((a: any) => a.dateKey === dateKey && a.isUnavailable).length;

  // Arrival time is fixed at 30 minutes prior to kick off
  const arrivalTime = new Date(date.getTime() - 30 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const applicableDuties = (dutiesConfig.length > 0 ? dutiesConfig : [
    { id: 'goalie', label: 'Goalie' },
    { id: 'snackProvider', label: 'Snack' },
    { id: 'pitchMarshal', label: 'Marshal' },
    { id: 'referee', label: 'Referee' }
  ]).filter((d: any) => {
    if (d.applicableTo === 'both') return true;
    if (d.applicableTo === 'home' && game.isHome) return true;
    if (d.applicableTo === 'away' && !game.isHome) return true;
    if (!d.applicableTo) return true; // Legacy fallback
    return false;
  });

  const isMissingDuties = applicableDuties.some(d => {
    const assignee = (game.assignments && game.assignments[d.id]) || (d.id === 'goalie' ? game.goalie : d.id === 'snackProvider' ? game.snackProvider : d.id === 'pitchMarshal' ? game.pitchMarshal : d.id === 'referee' ? game.referee : null);
    return !assignee;
  });

  const isSwapPending = applicableDuties.some(d => {
    return (game.swapRequests && game.swapRequests[d.id]) || (d.id === 'goalie' ? game.goalieSwapRequested : d.id === 'snackProvider' ? game.snackSwapRequested : d.id === 'pitchMarshal' ? game.marshalSwapRequested : d.id === 'referee' ? game.refereeSwapRequested : false);
  });
  
  const hasNotes = feedbacks.some((f: any) => f.gameId === game.id);

  const myDutyObj = applicableDuties.find(d => {
    const assignee = (game.assignments && game.assignments[d.id]) || (d.id === 'goalie' ? game.goalie : d.id === 'snackProvider' ? game.snackProvider : d.id === 'pitchMarshal' ? game.pitchMarshal : d.id === 'referee' ? game.referee : null);
    return assignee === userName;
  });
  const myDuty = myDutyObj?.label || null;

  const dutyIcon = myDutyObj?.id === 'snack_provider' ? <Utensils className="w-3 h-3" /> :
                   myDutyObj?.id === 'pitch_marshal' ? <Shield className="w-3 h-3" /> :
                   myDutyObj?.id === 'referee' ? <Flag className="w-3 h-3" /> :
                   myDutyObj ? <HandMetal className="w-3 h-3" /> : null;

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-white p-5 rounded-[2rem] shadow-sm border flex flex-col cursor-pointer transition-all gap-5 ${
        myDuty ? 'border-emjsc-red ring-1 ring-emjsc-red/20 bg-red-50/10' :
        isSwapPending ? 'border-orange-300 bg-orange-50/30' : 'border-slate-200 hover:border-emjsc-navy'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {date.toLocaleString('default', { month: 'short' })} {date.getDate()} • {game.isHome ? 'Home' : 'Away'}
            </p>
            {!game.isHome && game.travelTimeMinutes && (
              <div className="flex items-center gap-1 text-[8px] font-black text-emjsc-red uppercase tracking-widest bg-red-50/50 px-1.5 py-0.5 rounded border border-red-100/50">
                <Zap className="w-2.5 h-2.5" />
                Est. {game.travelTimeMinutes} min travel from {homeGround || 'Central Park'}
              </div>
            )}
            {hasNotes && (
              <div className="flex items-center gap-1 text-[8px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                <MessageCircle className="w-2.5 h-2.5" />
                Coach Note
              </div>
            )}
            {isUnavailable && (
              <div className="flex items-center gap-1 text-[8px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                <UserMinus className="w-2.5 h-2.5" />
                Unavailable
              </div>
            )}
            {totalUnavailable > 0 && !isUnavailable && (
              <div className="flex items-center gap-1 text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                <Users className="w-2.5 h-2.5" />
                {totalUnavailable} Out
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xl font-black text-emjsc-navy leading-none uppercase italic truncate">Vs {game.opponent}</p>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emjsc-red shrink-0" />
              <p className="text-[10px] text-slate-500 font-bold uppercase truncate tracking-tight">{game.location}</p>
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50 min-w-[100px]">
          <div className="flex flex-col items-start sm:items-end gap-0.5">
            <p className="text-[10px] text-emjsc-navy font-black leading-none uppercase tracking-tighter">ARRIVE {arrivalTime}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">KICK OFF {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${
            isMissingDuties || isSwapPending ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'
          }`}>
            {isSwapPending ? 'Swap Needed' : isMissingDuties ? 'Help Wanted' : 'Ready'}
          </div>
        </div>
      </div>

      {myDuty && (
        <div className="bg-emjsc-navy text-white text-[9px] px-4 py-2 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm border border-emjsc-red/30 w-full animate-pulse">
          {dutyIcon}
          Your Duty: {myDuty}
        </div>
      )}
    </motion.div>
  );
}

function GameDetailView({ game, user, homeGround, feedbacks, onBack, onSignUp, onRequestSwap, isSyncing, availabilities = [], onToggleAvailability, dutiesConfig = [] }: any) {
  const date = new Date(game.date);
  const dateKey = game.date.split('T')[0];
  const isUnavailable = availabilities.some((a: any) => a.playerName === user.displayName && a.dateKey === dateKey && a.isUnavailable);
  const matchAvailabilities = availabilities.filter((a: any) => a.dateKey === dateKey && a.isUnavailable);

  // Arrival time is fixed at 30 minutes prior to kick off
  const arrivalTime = new Date(date.getTime() - 30 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const applicableDuties = (dutiesConfig.length > 0 ? dutiesConfig : [
    { id: 'goalie', label: 'Goalie' },
    { id: 'snack_provider', label: 'Snack' },
    { id: 'pitch_marshal', label: 'Marshal' },
    { id: 'referee', label: 'Referee' }
  ]).filter((d: any) => {
    if (d.applicableTo === 'both') return true;
    if (d.applicableTo === 'home' && game.isHome) return true;
    if (d.applicableTo === 'away' && !game.isHome) return true;
    if (!d.applicableTo) return true; // Legacy fallback
    return false;
  });

  const playerFeedback = feedbacks.find((f: any) => f.gameId === game.id && f.playerName === user.displayName);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6"
    >
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {game.isHome && (
                <div className="bg-emjsc-red text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">Home Ground Match</div>
              )}
              <div className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-slate-200">Arrive {arrivalTime}</div>
            </div>
            
            <button 
              onClick={() => onToggleAvailability(user.displayName, dateKey)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 ${
                isUnavailable 
                  ? 'bg-red-50 text-emjsc-red border border-red-100' 
                  : 'bg-green-50 text-green-600 border border-green-100'
              }`}
            >
              {isUnavailable ? <UserMinus className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {isUnavailable ? "My Availability: Unavailable" : "My Availability: Available"}
            </button>
          </div>
          <h3 className="text-4xl font-black text-slate-800 leading-[0.9] tracking-tight mb-4 uppercase">Vs {game.opponent}</h3>
          <div className="space-y-2">
            <p className="text-slate-500 font-bold text-sm flex items-center gap-2 uppercase tracking-tight">
              <Calendar className="w-4 h-4 text-emjsc-red" />
              {date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Kick Off
            </p>
            <p className="text-emjsc-navy text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emjsc-red" />
              <a 
                href={game.mapUrlOverride || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(game.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {game.location}
              </a>
            </p>
          </div>
        </div>

        {playerFeedback && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playerFeedback.goals && (
              <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 mb-2 flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Your Match Goals
                </h4>
                <p className="text-xs font-bold text-slate-700 leading-relaxed uppercase tracking-tight">
                  {playerFeedback.goals}
                </p>
              </div>
            )}
            {playerFeedback.feedback && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emjsc-navy mb-2 flex items-center gap-2">
                  <HandMetal className="w-4 h-4" />
                  Privat Feedback
                </h4>
                <p className="text-xs font-bold text-slate-600 leading-relaxed italic uppercase tracking-tight">
                  "{playerFeedback.feedback}"
                </p>
              </div>
            )}
          </div>
        )}

        {matchAvailabilities.length > 0 && (
          <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emjsc-red mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Unavailable Players ({matchAvailabilities.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {matchAvailabilities.map((a: any) => (
                <span key={a.playerName} className="text-[10px] font-bold text-slate-600 bg-white border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
                  {a.playerName}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Volunteer Assignments
            </h4>
            <div className="space-y-5">
              {applicableDuties.map(duty => {
                const assignee = (game.assignments && game.assignments[duty.id]) || (duty.id === 'goalie' ? game.goalie : duty.id === 'snack_provider' ? game.snackProvider : duty.id === 'pitch_marshal' ? game.pitchMarshal : duty.id === 'referee' ? game.referee : null);
                const swapRequested = (game.swapRequests && game.swapRequests[duty.id]) || (duty.id === 'goalie' ? game.goalieSwapRequested : duty.id === 'snack_provider' ? game.snackSwapRequested : duty.id === 'pitch_marshal' ? game.marshalSwapRequested : duty.id === 'referee' ? game.refereeSwapRequested : false);
                
                return (
                  <DutyRow 
                    key={duty.id}
                    label={duty.label}
                    assignedTo={assignee}
                    onSignUp={() => onSignUp(game.id, duty.id)}
                    isMe={assignee === user.displayName}
                    swapRequested={swapRequested}
                    onRequestSwap={(e: any) => { e.stopPropagation(); onRequestSwap(game.id, duty.id); }}
                    isSyncing={isSyncing === `${game.id}-${duty.id}`}
                  />
                );
              })}
              {applicableDuties.length === 0 && <p className="text-center text-[10px] font-black uppercase text-slate-400 py-4 italic">No duties required for this match.</p>}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DutyRow({ label, assignedTo, onSignUp, isMe, swapRequested, onRequestSwap, isSyncing }: any) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-700 leading-tight tracking-tight">{label}</span>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold leading-none ${assignedTo ? 'text-slate-500' : 'text-slate-400 italic font-medium'}`}>
              {assignedTo ? assignedTo : 'Volunteer Needed!'}
            </span>
            {swapRequested && !isMe && (
              <span className="bg-orange-100 text-orange-600 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase border border-orange-200 animate-pulse">SWAP REQ</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onSignUp}
            disabled={isSyncing}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all border flex items-center gap-2 ${
              isMe 
                ? swapRequested ? 'bg-orange-500 text-white border-orange-500 animate-pulse' : 'bg-emjsc-red text-white border-emjsc-red shadow-lg shadow-red-900/20' 
                : (assignedTo && !swapRequested)
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                  : swapRequested 
                    ? 'bg-orange-600 text-white border-orange-600 shadow-md ring-4 ring-orange-200'
                    : 'bg-emjsc-navy text-white border-emjsc-navy shadow-md shadow-blue-900/10 active:scale-95'
            } ${isSyncing ? 'opacity-70 grayscale cursor-wait' : ''}`}
          >
            {isSyncing && <Zap className="w-3 h-3 animate-spin" />}
            {isMe ? (swapRequested ? 'Cancel Request' : 'Request Swap') : swapRequested ? 'Claim Swap' : assignedTo ? 'Taken' : 'Claim'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-20 text-center space-y-4">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
        <Calendar className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h3 className="font-bold text-lg">No games scheduled</h3>
        <p className="text-slate-500 text-sm">Please contact your coach for more info.</p>
      </div>
    </div>
  );
}

function DutySummaryView({ 
  games, 
  userName, 
  onSignUp, 
  isSyncing, 
  dutiesConfig = [],
  availabilities = [],
  onToggleAvailability
}: { 
  games: GameType[], 
  userName: string, 
  onSignUp: any, 
  isSyncing: string | null, 
  dutiesConfig?: any[],
  availabilities?: any[],
  onToggleAvailability: any
}) {
  if (dutiesConfig.length === 0) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-12 text-center shadow-xl shadow-slate-200/50 space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200 rotate-12 group-hover:rotate-0 transition-transform duration-500">
          <Shield className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-emjsc-navy uppercase tracking-tighter">No Duties Configured</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-[240px] mx-auto">
            The team manager hasn't set up the duty roster for the squad yet. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  const displayDuties = dutiesConfig;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-emjsc-navy uppercase tracking-tighter">Duty Assignment Matrix</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manage your team contributions</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Unavailable (Swap Forced)</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mt-2">
        <div className="overflow-x-auto custom-scrollbar pt-1">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Date</th>
                <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Opponent</th>
                <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Status</th>
                {displayDuties.map(d => (
                  <th key={d.id} className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {games.map(game => {
                const d = new Date(game.date);
                const dateKey = game.date.split('T')[0];
                const isUnavailable = availabilities.some(a => a.playerName === userName && a.dateKey === dateKey && a.isUnavailable);

                return (
                  <tr key={game.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <p className="text-[10px] font-black text-slate-800 leading-tight">
                        {d.getDate()}<br/>{d.toLocaleString('default', { month: 'short' })}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="text-[10px] font-black text-emjsc-navy truncate max-w-[70px] uppercase">{game.opponent}</p>
                      <p className="text-[8px] font-bold text-slate-400">{game.isHome ? 'HOME' : 'AWAY'}</p>
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => onToggleAvailability(userName, dateKey)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 mx-auto ${
                          isUnavailable 
                            ? 'bg-red-100 text-red-600 border border-red-200' 
                            : 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'
                        }`}
                      >
                        {isUnavailable ? <UserMinus className="w-2.5 h-2.5" /> : <UserCheck className="w-2.5 h-2.5" />}
                        {isUnavailable ? 'Out' : 'In'}
                      </button>
                    </td>
                    {displayDuties.map(duty => {
                       const isApplicable = duty.applicableTo === 'both' || (duty.applicableTo === 'home' && game.isHome) || (duty.applicableTo === 'away' && !game.isHome) || !duty.applicableTo;
                       if (!isApplicable) {
                         return <td key={duty.id} className="p-3 text-center text-slate-200 text-xs">-</td>;
                       }
                       const assignee = (game.assignments && game.assignments[duty.id]) || (duty.id === 'goalie' ? game.goalie : duty.id === 'snack_provider' ? game.snackProvider : duty.id === 'pitch_marshal' ? game.pitchMarshal : duty.id === 'referee' ? game.referee : null);
                       const swap = (game.swapRequests && game.swapRequests[duty.id]) || (duty.id === 'goalie' ? game.goalieSwapRequested : duty.id === 'snack_provider' ? game.snackSwapRequested : duty.id === 'pitch_marshal' ? game.marshalSwapRequested : duty.id === 'referee' ? game.refereeSwapRequested : false);
                       
                       return (
                         <td key={duty.id} className="p-3">
                           <DutyCell 
                             assignedTo={assignee} 
                             swapRequested={swap}
                             onSignUp={() => onSignUp(game.id, duty.id)} 
                             isMe={assignee === userName}
                             isSyncing={isSyncing === `${game.id}-${duty.id}`}
                             userUnavailable={isUnavailable}
                           />
                         </td>
                       );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DutyCell({ assignedTo, onSignUp, isMe, swapRequested, isSyncing, userUnavailable }: any) {
  return (
    <button 
      onClick={onSignUp}
      disabled={isSyncing || (userUnavailable && !isMe)}
      className={`w-full py-1.5 px-1 rounded-lg text-[9px] font-black uppercase transition-all border flex items-center justify-center gap-1 ${
        isMe 
          ? swapRequested ? 'bg-orange-500 text-white border-orange-500 animate-pulse' : 'bg-emjsc-red text-white border-emjsc-red shadow-sm' 
          : (assignedTo && !swapRequested) || (userUnavailable && !isMe)
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
            : swapRequested || !assignedTo
              ? swapRequested ? 'bg-orange-600 text-white border-orange-600 animate-pulse' : 'bg-white text-emjsc-navy border-slate-200 shadow-sm active:scale-95'
              : 'bg-slate-50 text-slate-300'
      } ${swapRequested && !isMe ? 'ring-2 ring-orange-400' : ''} ${isSyncing ? 'opacity-70 grayscale cursor-wait' : ''}`}
    >
      {isSyncing && <Zap className="w-2.5 h-2.5 animate-spin" />}
      {isMe ? (swapRequested ? 'Cancel' : 'Swap') : swapRequested ? 'TAKE' : (assignedTo ? assignedTo.split(' ')[0] : (userUnavailable ? 'N/A' : 'Claim'))}
    </button>
  );
}

function AdminCommunications({ 
  games = [], 
  feedbacks = [], 
  announcements = [],
  onUpdateFeedback,
  onAddAnnouncement,
  onDeleteAnnouncement
}: any) {
  const [selectedGameId, setSelectedGameId] = useState(games[0]?.id || '');
  const [bulkFeedback, setBulkFeedback] = useState<any>({});
  const [status, setStatus] = useState<string | null>(null);
  
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnType, setNewAnnType] = useState<'message' | 'goal'>('message');

  const selectedGame = games.find((g: any) => g.id === selectedGameId);

  useEffect(() => {
    if (!selectedGameId && games.length > 0) {
      setSelectedGameId(games[0].id);
    }
  }, [games, selectedGameId]);

  useEffect(() => {
    if (selectedGame) {
      const newBulk: any = {};
      TEAM_SQUAD.forEach(player => {
        const existing = feedbacks.find((f: any) => f.gameId === selectedGameId && f.playerName === player.name);
        newBulk[player.name] = {
          goals: existing?.goals || '',
          feedback: existing?.feedback || ''
        };
      });
      setBulkFeedback(newBulk);
    }
  }, [selectedGameId]); 

  const handleUpdateBulk = (playerName: string, field: 'goals' | 'feedback', value: string) => {
    setBulkFeedback((prev: any) => ({
      ...prev,
      [playerName]: {
        ...prev[playerName],
        [field]: value
      }
    }));
  };

  const handleSaveAll = async () => {
    if (!selectedGameId) return;
    setStatus('Saving everything...');
    
    // Save all player feedack
    const promises = TEAM_SQUAD.map(player => {
      const data = bulkFeedback[player.name];
      return onUpdateFeedback(selectedGameId, player.name, data.feedback, data.goals);
    });
    
    await Promise.all(promises);
    
    setStatus('All Communications Saved!');
    setTimeout(() => setStatus(null), 2000);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 overflow-hidden">
       <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Coaches Communications</h3>
          {status && <span className="text-[9px] font-black uppercase text-emjsc-red animate-pulse">{status}</span>}
       </div>

       <div className="space-y-6">
         <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
           <h4 className="text-[10px] font-black uppercase tracking-widest text-emjsc-navy">Team Messages & Goals (Not Tied to Match)</h4>
           <div className="space-y-3">
             <textarea 
               value={newAnnContent}
               onChange={(e) => setNewAnnContent(e.target.value)}
               placeholder="Post a general team message or collective goal..."
               className="w-full h-20 p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emjsc-navy resize-none"
             />
             <div className="flex items-center gap-2">
               <div className="flex items-center gap-1">
                 <button 
                   onClick={() => setNewAnnType('message')}
                   className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newAnnType === 'message' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
                 >
                   Message
                 </button>
                 <button 
                   onClick={() => setNewAnnType('goal')}
                   className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newAnnType === 'goal' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
                 >
                   Goal
                 </button>
               </div>
               <div className="flex-1" />
               <button 
                 onClick={() => {
                   if (!newAnnContent.trim()) return;
                   onAddAnnouncement(newAnnContent.trim(), newAnnType);
                   setNewAnnContent('');
                 }}
                 className="bg-emjsc-navy text-white text-[9px] font-black uppercase px-4 py-2 rounded-xl shadow-md active:scale-95 flex items-center gap-2"
               >
                 <Plus className="w-3 h-3" />
                 Post Global
               </button>
             </div>
           </div>

           {announcements && announcements.length > 0 && (
             <div className="pt-4 border-t border-slate-100 space-y-2 max-h-48 overflow-y-auto no-scrollbar">
               {announcements.map((ann: any) => (
                 <div key={ann.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm group">
                   <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ann.type === 'goal' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                   <div className="flex-1 min-w-0">
                     <p className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-1 italic uppercase tracking-tighter">"{ann.content}"</p>
                     <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                       {ann.type} • {ann.timestamp?.toDate ? ann.timestamp.toDate().toLocaleDateString() : 'Just now'}
                     </p>
                   </div>
                   <button 
                     onClick={() => onDeleteAnnouncement(ann.id)}
                     className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-emjsc-red transition-all"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                 </div>
               ))}
             </div>
           )}
         </div>

         <div className="space-y-2 max-w-xs">
           <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Select Match</label>
           <select 
             value={selectedGameId}
             onChange={(e) => setSelectedGameId(e.target.value)}
             className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none"
           >
             {games.map((g: any) => (
               <option key={g.id} value={g.id}>
                 {new Date(g.date).toLocaleDateString()} vs {g.opponent}
               </option>
             ))}
           </select>
         </div>

         <div className="space-y-4 pt-4 border-t border-slate-50">
           <div className="space-y-2">
             <textarea 
             />
           </div>

           <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Player Specific Feedback</h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-3 text-[9px] font-black uppercase text-slate-400 w-32">Player</th>
                      <th className="p-3 text-[9px] font-black uppercase text-slate-400">Match Goals (Orange Box)</th>
                      <th className="p-3 text-[9px] font-black uppercase text-slate-400">Private Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {TEAM_SQUAD.map(player => (
                      <tr key={player.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 align-top">
                          <p className="text-[10px] font-black text-emjsc-navy uppercase">{player.name}</p>
                        </td>
                        <td className="p-3 align-top">
                          <textarea 
                            value={bulkFeedback[player.name]?.goals || ''}
                            onChange={(e) => handleUpdateBulk(player.name, 'goals', e.target.value)}
                            placeholder="e.g. Focus on passing"
                            className="w-full h-16 p-2 bg-orange-50/30 border border-orange-100 rounded-xl text-[10px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-orange-300 resize-none"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <textarea 
                            value={bulkFeedback[player.name]?.feedback || ''}
                            onChange={(e) => handleUpdateBulk(player.name, 'feedback', e.target.value)}
                            placeholder="Message to parents/player"
                            className="w-full h-16 p-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emjsc-navy resize-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>

           <button 
             onClick={handleSaveAll}
             className="w-full bg-emjsc-red text-white text-[11px] font-black uppercase py-4 rounded-2xl shadow-xl shadow-red-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
           >
             <Check className="w-4 h-4" />
             Save All Communications
           </button>
         </div>
       </div>
    </div>
  );
}

function AdminModeration({ messages = [], blocks = [], onAdminDeleteMessage, onAdminDeleteBlock }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Chat & Block Moderation</h3>
      
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-emjsc-navy uppercase">Recent Messages</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
          {(messages || []).slice().reverse().map((msg: any) => (
            <div key={msg.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{msg.sender} → {msg.receiver}</p>
                <p className="text-sm font-medium">{msg.content}</p>
              </div>
              <button 
                onClick={() => onAdminDeleteMessage(msg.id)}
                className="p-2 bg-red-100 text-emjsc-red rounded-lg hover:bg-red-200 transition-colors"
                title="Delete message"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {messages.length === 0 && <p className="text-xs text-slate-400 uppercase tracking-widest text-center">No messages.</p>}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h4 className="text-xs font-bold text-emjsc-navy uppercase">Active Blocks</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
          {blocks.map((block: any) => (
            <div key={block.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-800 uppercase">{block.blocker} <span className="text-emjsc-red">blocked</span> {block.blocked}</p>
              <button 
                onClick={() => onAdminDeleteBlock(block.id)}
                className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1 rounded-lg uppercase tracking-widest hover:bg-slate-300"
              >
                Remove Block
              </button>
            </div>
          ))}
          {blocks.length === 0 && <p className="text-xs text-slate-400 uppercase tracking-widest text-center">No blocks.</p>}
        </div>
      </div>
    </div>
  );
}

function MatchEditor({ games, onUpdate, availabilities = [], dutiesConfig = [], onDeleteGame }: any) {
  const [selectedGameId, setSelectedGameId] = useState(games[0]?.id || '');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [opponent, setOpponent] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGameId && games.length > 0) {
      setSelectedGameId(games[0].id);
    }
  }, [games, selectedGameId]);

  const selectedGame = games.find((g: any) => g.id === selectedGameId);
  const dateKey = selectedGame?.date?.split('T')[0];
  const matchAvailabilities = availabilities.filter((a: any) => a.dateKey === dateKey && a.isUnavailable);

  useEffect(() => {
    if (selectedGame) {
      setVenue(selectedGame.location || '');
      setDate(selectedGame.date || '');
      setOpponent(selectedGame.opponent || '');
      setIsHome(selectedGame.isHome ?? true);
    }
  }, [selectedGameId, selectedGame]);

  const handleSave = async () => {
    if (!selectedGameId) return;
    setStatus('Syncing...');
    await onUpdate(selectedGameId, 'location', venue);
    await onUpdate(selectedGameId, 'date', date);
    await onUpdate(selectedGameId, 'opponent', opponent);
    await onUpdate(selectedGameId, 'isHome', isHome);
    setStatus('Saved!');
    setTimeout(() => setStatus(null), 2000);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove the match vs ${opponent}?`)) {
      onDeleteGame(selectedGameId);
      setSelectedGameId(games.find((g: any) => g.id !== selectedGameId)?.id || '');
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Match Detail Editor</h3>
        {status && <span className="text-[9px] font-black uppercase text-emjsc-red animate-pulse">{status}</span>}
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Select Match</label>
          <div className="flex gap-2">
            <select 
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none"
            >
              {games.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {new Date(g.date).toLocaleDateString()} vs {g.opponent}
                </option>
              ))}
            </select>
            <button 
              onClick={handleDelete}
              className="p-3 bg-red-100 text-emjsc-red rounded-xl hover:bg-red-200 transition-colors"
              title="Delete Match"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Opponent</label>
            <input 
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Home / Away</label>
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => setIsHome(true)}
                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${isHome ? 'bg-white text-emjsc-navy shadow-sm' : 'text-slate-400'}`}
              >
                Home
              </button>
              <button 
                onClick={() => setIsHome(false)}
                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${!isHome ? 'bg-white text-emjsc-navy shadow-sm' : 'text-slate-400'}`}
              >
                Away
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Venue / Location</label>
            <input 
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date & Arrival Time</label>
            <input 
              type="datetime-local"
              value={date ? date.substring(0, 16) : ''}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-emjsc-navy outline-none"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manual Duty Assignments</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {dutiesConfig.map((duty: any) => {
              const isApplicable = duty.applicableTo === 'both' || (duty.applicableTo === 'home' && isHome) || (duty.applicableTo === 'away' && !isHome) || !duty.applicableTo;
              if (!isApplicable) return null;
              
              const assignee = (selectedGame?.assignments && selectedGame.assignments[duty.id]) || (duty.id === 'goalie' ? selectedGame?.goalie : duty.id === 'snack_provider' ? selectedGame?.snackProvider : duty.id === 'pitch_marshal' ? selectedGame?.pitchMarshal : duty.id === 'referee' ? selectedGame?.referee : "");

              return (
                <div key={duty.id} className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-500 flex items-center justify-between">
                    {duty.label}
                    {selectedGame?.swapRequests?.[duty.id] && <span className="bg-orange-100 text-orange-600 px-1 rounded-sm animate-pulse">Swap Req</span>}
                  </label>
                  <select 
                    value={assignee || ""}
                    onChange={(e) => onUpdate(selectedGameId, duty.id, e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-emjsc-navy outline-none"
                  >
                    <option value="">(Empty)</option>
                    {TEAM_SQUAD.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
        
        {matchAvailabilities.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-emjsc-red mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Unavailable Players for this date ({matchAvailabilities.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {matchAvailabilities.map((a: any) => (
                <div key={a.playerName} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 rounded-full">
                  <UserMinus className="w-2.5 h-2.5 text-emjsc-red" />
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">{a.playerName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={handleSave}
          className="w-full bg-emjsc-navy text-white text-[10px] font-black uppercase py-4 rounded-2xl shadow-xl shadow-blue-900/10 active:scale-[0.98] transition-all"
        >
          Update Match Details
        </button>
      </div>
    </div>
  );
}

// DutyManager component
function DutyManager({ 
  duties = [], 
  onAdd, 
  onUpdate, 
  onDelete,
  coachChild,
  onUpdateCoachChild,
  coachExemptDuties = [],
  onUpdateCoachExemptDuties
}: any) {
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'player' | 'parent'>('player');
  const [newApplicability, setNewApplicability] = useState<'home' | 'away' | 'both'>('both');

  const defaultDuties = [
    { id: 'goalie', label: 'Goalie (1st Half)', type: 'player', maxPerWeek: 1, maxPerType: 1, applicableTo: 'both' },
    { id: 'goalie_2', label: 'Goalie (2nd Half)', type: 'player', maxPerWeek: 1, maxPerType: 1, applicableTo: 'both' },
    { id: 'snack_provider', label: 'Match Day Snacks', type: 'parent', maxPerWeek: 1, maxPerType: 1, applicableTo: 'both' },
    { id: 'referee', label: 'Referee', type: 'parent', maxPerWeek: 1, maxPerType: 1, applicableTo: 'home' },
    { id: 'pitch_marshal', label: 'Pitch Marshall', type: 'parent', maxPerWeek: 1, maxPerType: 1, applicableTo: 'home' },
  ];

  const handleAddDefault = () => {
    defaultDuties.forEach(d => {
      if (!duties.some((existing: any) => existing.id === d.id)) {
        onAdd(d as any);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Team Duty Settings</h3>
          <button 
            onClick={handleAddDefault}
            className="text-[8px] font-black uppercase tracking-widest text-emjsc-navy bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors"
          >
            Create Default Duties
          </button>
        </div>
        
        <div className="space-y-4">
          {duties?.map((d: any) => (
            <div key={d.id} className="grid grid-cols-12 gap-2 items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="col-span-4 space-y-1">
                <input 
                  className="w-full bg-transparent text-xs font-bold text-emjsc-navy outline-none"
                  value={d.label}
                  onChange={(e) => onUpdate({ ...d, label: e.target.value })}
                />
              </div>
              <select 
                className="col-span-2 p-1 bg-transparent text-[9px] font-black uppercase text-emjsc-navy outline-none"
                value={d.type}
                onChange={(e) => onUpdate({ ...d, type: e.target.value })}
              >
                <option value="player">Player</option>
                <option value="parent">Parent</option>
              </select>
              <select 
                className="col-span-2 p-1 bg-transparent text-[9px] font-black uppercase text-emjsc-navy outline-none"
                value={d.applicableTo || 'both'}
                onChange={(e) => onUpdate({ ...d, applicableTo: e.target.value })}
              >
                <option value="both">Both</option>
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
              <div className="col-span-2 flex items-center gap-1">
                <span className="text-[8px] text-slate-400 font-bold">MAX:</span>
                <input 
                  type="number"
                  className="w-8 p-1 bg-transparent text-[10px] font-bold text-emjsc-navy border-b border-slate-200 outline-none"
                  value={d.maxPerWeek}
                  onChange={(e) => onUpdate({ ...d, maxPerWeek: parseInt(e.target.value) || 1 })}
                />
              </div>
              <button onClick={() => onDelete(d.id)} className="col-span-2 flex justify-end text-emjsc-red hover:scale-110 transition-transform">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
          <input 
            placeholder="New Duty Name (e.g. Oranges)"
            className="flex-1 min-w-[150px] p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <select 
            className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase text-emjsc-navy"
            value={newType}
            onChange={(e) => setNewType(e.target.value as any)}
          >
            <option value="player">Player</option>
            <option value="parent">Parent</option>
          </select>
          <select 
            className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase text-emjsc-navy"
            value={newApplicability}
            onChange={(e) => setNewApplicability(e.target.value as any)}
          >
            <option value="both">Both Games</option>
            <option value="home">Home Only</option>
            <option value="away">Away Only</option>
          </select>
          <button 
            onClick={() => {
              if (!newLabel.trim()) return;
              onAdd({ 
                id: newLabel.toLowerCase().replace(/\s+/g, '_'), 
                label: newLabel, 
                type: newType, 
                maxPerWeek: 1, 
                maxPerType: 1,
                applicableTo: newApplicability 
              });
              setNewLabel('');
            }}
            className="bg-emjsc-navy text-white px-5 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Coach's Child Duty Exemption</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Select Coach's Child</label>
              <select
                value={coachChild || ""}
                onChange={(e) => onUpdateCoachChild(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy"
              >
                <option value="">None Selected</option>
                {TEAM_SQUAD.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              <p className="text-[8px] text-slate-400 italic px-1 font-bold">This player will be excluded from the duties selected on the right.</p>
            </div>
          </div>

          <div className="space-y-4">
            {coachChild ? (
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <p className="text-[10px] font-black uppercase text-emjsc-navy tracking-wider text-center">Exempt {coachChild} from:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {duties.map((d: any) => (
                    <label key={d.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer group hover:bg-slate-50 transition-colors">
                      <input 
                        type="checkbox"
                        checked={coachExemptDuties.includes(d.id)}
                        onChange={(e) => {
                          const newDuties = e.target.checked 
                            ? [...coachExemptDuties, d.id]
                            : coachExemptDuties.filter((id: string) => id !== d.id);
                          onUpdateCoachExemptDuties(newDuties);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-emjsc-navy focus:ring-emjsc-navy"
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase group-hover:text-emjsc-navy truncate">{d.label}</span>
                    </label>
                  ))}
                  {duties.length === 0 && <p className="col-span-2 text-[9px] text-center text-slate-400 uppercase font-black py-4">No duties configured yet.</p>}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center italic">Select a child first to set exemptions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminView({ 
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
  trainingCancelled,
  onToggleTraining,
  trainingLocation,
  onUpdateTrainingLocation,
  homeGround,
  onUpdateHomeGround,
  onRefreshTravelTimes,
  onBulkSync,
  onSyncDribl,
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
  onUpdateAnnouncement: handleUpdateAnnouncement, // Assume it exists
  onDeleteAnnouncement,
  availabilities,
  messagingEnabled,
  onUpdateMessagingEnabled,
  dutiesConfig,
  onUpdateDutyConfig,
  onAddDutyConfig,
  onDeleteDutyConfig
}: any) {
  const [bulkJson, setBulkJson] = useState('');
  const [activeTab, setActiveTab] = useState('ops'); // ops, content, matches, moderate, settings, duties
  
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
    { id: 'ops', label: 'Dashboard', icon: <Zap className="w-3 h-3" /> },
    { id: 'content', label: 'Coach Wrap', icon: <MessageCircle className="w-3 h-3" /> },
    { id: 'matches', label: 'Match Day', icon: <Calendar className="w-3 h-3" /> },
    ...(messagingEnabled ? [{ id: 'moderate', label: 'Moderation', icon: <Shield className="w-3 h-3" /> }] : []),
    { id: 'duties', label: 'Duty Manager', icon: <Utensils className="w-3 h-3" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight text-emjsc-navy uppercase">Admin Hub</h2>
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${trainingCancelled ? 'bg-emjsc-red animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[8px] font-black uppercase text-slate-500">{trainingCancelled ? 'Closed' : 'Open'}</span>
          </div>
        </div>
        
        {/* Horizontal Navigation */}
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
        {activeTab === 'ops' && (
          <motion.div 
            key="ops"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <div className="bg-emjsc-navy p-7 rounded-[2.5rem] text-white space-y-6 shadow-xl border-b-8 border-emjsc-red relative overflow-hidden">
               <div className="relative z-10">
                 <div className="flex items-center justify-between">
                   <h3 className="text-xl font-black uppercase flex items-center gap-2">
                     Quick Actions
                   </h3>
                   <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
                 </div>
                 
                 <div className="grid grid-cols-1 gap-3 mt-6">
                   <button 
                     onClick={onRefreshTravelTimes}
                     className="w-full bg-white/10 text-white border border-white/20 font-black py-4 rounded-2xl uppercase tracking-[0.1em] text-[10px] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                   >
                     <RefreshCw className="w-4 h-4" />
                     Sync Travel Times
                   </button>
                 </div>
               </div>
               <Zap className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12" />
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Match Day Operations</h3>
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-emjsc-navy leading-none">Training Status</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase">{trainingCancelled ? 'Currently closed' : 'Scheduled as normal'}</p>
                </div>
                <button 
                  onClick={() => onToggleTraining(!trainingCancelled)}
                  className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md ${
                    trainingCancelled 
                      ? 'bg-green-500 text-white' 
                      : 'bg-emjsc-red text-white'
                  }`}
                >
                  {trainingCancelled ? 'Open' : 'Cancel'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'content' && (
          <motion.div 
            key="content"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <AdminCommunications 
              games={games} 
              feedbacks={feedbacks} 
              announcements={announcements}
              onUpdateFeedback={onUpdateFeedback} 
              onAddAnnouncement={onAddAnnouncement}
              onDeleteAnnouncement={onDeleteAnnouncement}
            />
          </motion.div>
        )}

        {activeTab === 'matches' && (
          <motion.div 
            key="matches"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <MatchEditor 
              games={games}
              onUpdate={onManualAssign}
              availabilities={availabilities}
              dutiesConfig={dutiesConfig}
              onDeleteGame={onDeleteGame}
            />
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fixture Integration</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={onSyncDribl}
                    className="bg-emjsc-red text-white text-[8px] font-black uppercase px-3 py-1.5 rounded-lg border border-emjsc-red hover:bg-emjsc-red/90 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    Sync Dribl
                  </button>
                  <div className="bg-slate-100 px-2 py-1 rounded text-[8px] font-bold text-slate-400">DRIBL API</div>
                </div>
              </div>
              <div className="space-y-4">
                <textarea 
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  placeholder='Paste PlayFootball JSON here...'
                  className="w-full h-40 p-5 bg-slate-50 border border-slate-100 rounded-3xl text-[10px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emjsc-navy resize-none font-mono"
                />
                <button 
                  onClick={() => { onBulkSync(bulkJson); setBulkJson(''); }}
                  className="w-full bg-emjsc-navy text-white text-[10px] font-black uppercase py-4 rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sync New Fixtures
                </button>
                
                <button 
                  onClick={() => {
                    if (window.confirm("CRITICAL WARNING: This will PERMANENTLY DELETE the entire match schedule from the database. This cannot be undone. Proceed?")) {
                      onClearSchedule();
                    }
                  }}
                  className="w-full bg-red-100 text-emjsc-red text-[10px] font-black uppercase py-4 rounded-2xl transition-all flex items-center justify-center gap-3 border border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Wipe Full Schedule
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'moderate' && (
          <motion.div 
            key="moderate"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <AdminModeration
              messages={messages}
              blocks={blocks}
              onAdminDeleteMessage={onAdminDeleteMessage}
              onAdminDeleteBlock={onAdminDeleteBlock}
            />
          </motion.div>
        )}

        {activeTab === 'duties' && (
          <motion.div 
            key="duties"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            {/* Duty Automation Block */}
            <div className="bg-emjsc-navy p-6 rounded-[2rem] text-white shadow-lg border-b-4 border-emjsc-red relative overflow-hidden">
               <div className="relative z-10 space-y-4">
                 <div className="flex items-center justify-between">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em]">Duty Automation</h3>
                   <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <button 
                     onClick={() => {
                       if (window.confirm("ARE YOU SURE? This will automatically assign duties to all future games based on the rules. This cannot be easily undone.")) {
                         onAutoAllocate();
                       }
                     }}
                     className="w-full bg-white text-emjsc-navy font-black py-3 rounded-xl uppercase tracking-tighter text-[9px] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                   >
                     <Users className="w-3.5 h-3.5" />
                     Smart Allocate Duties
                   </button>
                   <button 
                     onClick={() => {
                       if (window.confirm("ARE YOU SURE? This cannot be undone and will wipe ALL future assignments.")) {
                         onClearDuties();
                       }
                     }}
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
                      dutiesConfig.forEach(d => counts[d.id] = 0);
                      
                      games.forEach((g: any) => {
                        // Check legacy
                        if (g.goalie === player.name) counts.goalie = (counts.goalie || 0) + 1;
                        if (g.snackProvider === player.name) counts.snack_provider = (counts.snack_provider || 0) + 1;
                        if (g.pitchMarshal === player.name) counts.pitch_marshal = (counts.pitch_marshal || 0) + 1;
                        if (g.referee === player.name) counts.referee = (counts.referee || 0) + 1;
                        
                        // Check dynamic
                        if (g.assignments) {
                          Object.entries(g.assignments).forEach(([dutyId, pName]) => {
                            if (pName === player.name) {
                              counts[dutyId] = (counts[dutyId] || 0) + 1;
                            }
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
                            <div className="w-6 h-6 bg-emjsc-navy rounded-lg flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                              {p.name.charAt(0)}
                            </div>
                            <span className="text-[10px] font-black text-emjsc-navy uppercase truncate">{p.name}</span>
                          </div>
                        </td>
                        {dutiesConfig.map((d: any) => (
                          <td key={d.id} className="px-2 py-3 text-center">
                            <span className="text-[9px] font-bold text-slate-400">{p.counts[d.id]}</span>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-[10px] font-bold text-white bg-emjsc-navy px-2 py-1 rounded-lg flex items-center justify-center w-fit ml-auto">
                            {p.total}
                          </span>
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

        {activeTab === 'settings' && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Configurations</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Team Home Ground</label>
                  <input 
                    type="text" 
                    defaultValue={homeGround}
                    onBlur={(e) => onUpdateHomeGround(e.target.value)}
                    placeholder="e.g. Central Park, Malvern VIC"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy"
                  />
                  <p className="text-[8px] text-slate-400 italic px-1 font-bold">Used for calculating travel estimates for away games.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Wednesday Training Venue</label>
                  <input 
                    type="text" 
                    defaultValue={trainingLocation}
                    onBlur={(e) => onUpdateTrainingLocation(e.target.value)}
                    placeholder="e.g. Gardiner Park"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-emjsc-navy outline-none focus:ring-1 focus:ring-emjsc-navy"
                  />
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
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        messagingEnabled ? 'bg-emjsc-red text-white' : 'bg-green-600 text-white'
                      }`}
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

function ProfileView({ userName, profiles, feedbacks, games, onUpdateProfile }: any) {
  const profile = profiles[userName] || {};
  const [skills, setSkills] = useState(profile.skills || '');
  const [isSaving, setIsSaving] = useState(false);

  // Automatically generate a soccer-themed profile picture based on the username
  const photoUrl = `https://picsum.photos/seed/${userName.replace(/\s+/g, '_')}_soccer/400`;

  const myFeedbacks = feedbacks
    .filter((f: any) => f.playerName === userName)
    .sort((a: any, b: any) => {
      const gA = games.find((g: any) => g.id === a.gameId);
      const gB = games.find((g: any) => g.id === b.gameId);
      return new Date(gB?.date || 0).getTime() - new Date(gA?.date || 0).getTime();
    });

  useEffect(() => {
    if (profile.skills) setSkills(profile.skills);
  }, [profile.skills]);

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdateProfile(skills, photoUrl);
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl shadow-slate-200/50 space-y-8">
        <div className="text-center space-y-4">
          <div className="relative inline-block group">
            <div className="w-32 h-32 bg-emjsc-navy rounded-[2rem] flex items-center justify-center text-4xl font-black text-white border-4 border-emjsc-red overflow-hidden shadow-2xl group-hover:rotate-3 transition-all duration-300">
              <img 
                src={photoUrl} 
                alt="Profile" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-emjsc-navy uppercase tracking-tight">{userName}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">EMJSC • U8 White Saturday • #77</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">My Skills & Description</label>
            <textarea 
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Tell the team about your skills, favourite position, or what you're working on!"
              className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emjsc-navy outline-none resize-none transition-all placeholder:text-slate-300"
            />
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-emjsc-navy text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 active:scale-95 transition-all hover:bg-emjsc-red disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {isSaving ? 'Saving Changes...' : 'Update Player Profile'}
          </button>
        </div>
      </div>

      {myFeedbacks.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-black text-emjsc-navy uppercase tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-emjsc-red" />
            Coach Feedback History
          </h3>
          <div className="space-y-4">
            {myFeedbacks.map((f: any) => {
              const game = games.find((g: any) => g.id === f.gameId);
              return (
                <div key={f.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       {game ? `vs ${game.opponent} • ${new Date(game.date).toLocaleDateString()}` : 'Past Match'}
                    </p>
                  </div>
                  {f.goals && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-orange-600 tracking-wider">Coach's Goals:</p>
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">{f.goals}</p>
                    </div>
                  )}
                  {f.feedback && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-emjsc-navy tracking-wider">Performance Feedback:</p>
                      <p className="text-xs font-bold text-slate-600 italic uppercase tracking-tight leading-relaxed">"{f.feedback}"</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-emjsc-red/5 border-2 border-dashed border-emjsc-red/20 rounded-3xl p-6 flex gap-4">
        <Zap className="w-6 h-6 text-emjsc-red shrink-0" />
        <p className="text-[10px] font-bold text-emjsc-red uppercase tracking-wide leading-relaxed">
          Tip: Each player has a unique soccer-themed profile picture! Your skills description will be shared with the rest of the squad to help everyone learn your strengths.
        </p>
      </div>
    </div>
  );
}

function MessagesView({ userName, messages = [], blocks = [], teamSquad = [], isAdmin, onSendMessage, onBlockUser, onUnblockUser, onMarkRead }: any) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  const chatList = useMemo(() => {
    const players = (teamSquad || []).filter((p: any) => p.name !== userName).map((p: any) => ({ name: p.name, type: 'player' }));
    if (!isAdmin) {
      return [{ name: 'Administrator', type: 'admin' }, ...players];
    }
    return players;
  }, [teamSquad, userName, isAdmin]);

  useEffect(() => {
    if (selectedUser) {
      onMarkRead(selectedUser);
    }
  }, [selectedUser, (messages || []).length]);

  const amIBlockedByThem = (otherUser: string) => (blocks || []).some((b: any) => b.blocker === otherUser && b.blocked === userName);
  const haveIBlockedThem = (otherUser: string) => (blocks || []).some((b: any) => b.blocker === userName && b.blocked === otherUser);

  const visibleMessages = (messages || []).filter((msg: any) => {
    if (!selectedUser) return false;
    return (msg.sender === userName && msg.receiver === selectedUser) || 
           (msg.sender === selectedUser && msg.receiver === userName);
  });

  const getUnreadCount = (senderName: string) => (messages || []).filter((m: any) => m.receiver === userName && m.sender === senderName && !m.read).length;

  const handleSend = () => {
    if (!messageText.trim() || !selectedUser) return;
    onSendMessage(selectedUser, messageText.trim());
    setMessageText("");
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[70vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Player List */}
      <div className="w-full md:w-1/3 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 bg-emjsc-navy border-b border-emjsc-navy/10 flex items-center gap-2">
          <Users className="w-4 h-4 text-white" />
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Contacts</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatList.map((p: any) => {
            const isBlocked = haveIBlockedThem(p.name);
            const unreadCount = getUnreadCount(p.name);
            return (
              <button
                key={p.name}
                onClick={() => setSelectedUser(p.name)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
                  selectedUser === p.name ? 'bg-slate-100 text-emjsc-navy' : 'bg-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase overflow-hidden relative ${
                    p.type === 'admin' ? 'bg-emjsc-red text-white' : 
                    selectedUser === p.name ? 'bg-emjsc-navy text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {p.type === 'admin' ? <Shield className="w-4 h-4" /> : (
                      <img 
                        src={`https://picsum.photos/seed/${p.name.replace(/\s+/g, '_')}_soccer/100`} 
                        alt={p.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm tracking-tight leading-none">{p.name}</p>
                    {p.type === 'admin' && <p className="text-[8px] text-emjsc-red font-black uppercase mt-1">Team Manager</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <div className="bg-emjsc-red text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                      {unreadCount}
                    </div>
                  )}
                  {isBlocked && <Ban className="w-4 h-4 text-emjsc-red" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="w-full md:w-2/3 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-sm relative">
        {selectedUser ? (
          <>
            <div className="p-4 bg-emjsc-navy border-b border-emjsc-navy/10 flex justify-between items-center z-10">
              <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Chatting with {selectedUser}
              </h3>
              {haveIBlockedThem(selectedUser) ? (
                <button 
                  onClick={() => onUnblockUser(selectedUser)}
                  className="text-[10px] font-black uppercase tracking-widest text-emjsc-navy bg-white px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-sm"
                >
                  Unblock
                </button>
              ) : (
                <button 
                  onClick={() => onBlockUser(selectedUser)}
                  className="text-[10px] font-black uppercase tracking-widest text-white/80 flex items-center gap-1 hover:text-white hover:bg-white/10 px-2 py-1.5 rounded-lg transition-all"
                >
                  <Ban className="w-3 h-3" /> Block
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 relative z-0">
              <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 text-slate-100 -z-10" />
              {visibleMessages.map((msg: any) => {
                const isMe = msg.sender === userName;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm ${isMe ? 'bg-emjsc-navy text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'}`}>
                      <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              {visibleMessages.length === 0 && (
                <div className="text-center flex flex-col items-center justify-center mt-20 gap-2 opacity-50">
                  <MessageCircle className="w-8 h-8 text-slate-400" />
                  <p className="text-slate-500 font-black text-xs uppercase tracking-widest">No messages yet. Say hi!</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-white z-10">
              {haveIBlockedThem(selectedUser) ? (
                <div className="flex items-center justify-center gap-2 text-emjsc-red font-bold text-xs p-3 uppercase tracking-widest bg-red-50 rounded-xl">
                  <Ban className="w-4 h-4" /> You have blocked this user
                </div>
              ) : amIBlockedByThem(selectedUser) ? (
                <div className="flex items-center justify-center gap-2 text-slate-500 font-bold text-xs p-3 uppercase tracking-widest bg-slate-100 rounded-xl">
                  <Ban className="w-4 h-4" /> You cannot send messages to this user
                </div>
              ) : (
                <div className="flex gap-2 relative">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 p-4 rounded-2xl border border-slate-200 font-medium text-sm outline-none focus:ring-2 focus:ring-emjsc-navy bg-slate-50 placeholder-slate-400 pr-20"
                  />
                  <button 
                    onClick={handleSend} 
                    className="absolute right-2 top-2 bottom-2 bg-emjsc-navy text-white px-5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emjsc-red transition-all active:scale-95 shadow-sm"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 relative">
            <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 text-slate-50 -z-10" />
            <MessageCircle className="w-16 h-16 mb-4 text-slate-200" />
            <p className="font-black text-sm uppercase tracking-widest text-slate-400">Select a teammate to chat</p>
          </div>
        )}
      </div>
    </div>
  );
}

