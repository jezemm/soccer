import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// CRITICAL: Test connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export interface Game {
  id: string;
  date: string;
  opponent: string;
  location: string;
  isHome: boolean;
  mapUrlOverride?: string;
  snackProvider?: string;
  pitchMarshal?: string;
  referee?: string;
  goalie?: string;
  snackSwapRequested?: boolean;
  marshalSwapRequested?: boolean;
  refereeSwapRequested?: boolean;
  goalieSwapRequested?: boolean;
  matchWrap?: string; // COACH: Message for the whole team
  kickOff?: string;
  travelTimeMinutes?: number;
  assignments?: Record<string, string>; // dutyId -> playerName
  swapRequests?: Record<string, boolean>; // dutyId -> boolean
}

export interface PlayerFeedback {
  id: string;
  gameId: string;
  playerName: string;
  feedback: string;
  goals: string;
  updatedAt: any;
}

export interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: any;
  read: boolean;
}

export interface Block {
  id: string;
  blocker: string;
  blocked: string;
  timestamp: any;
}

export interface Announcement {
  id: string;
  content: string;
  type: 'message' | 'goal';
  timestamp: any;
}

export interface Availability {
  id: string; // playerName_dateKey
  playerName: string;
  dateKey: string; // YYYY-MM-DD
  isUnavailable: boolean;
  updatedAt: any;
}

export interface DutyConfig {
  id: string; // duty name
  label: string;
  type: 'player' | 'parent';
  maxPerWeek: number;
  maxPerType: number;
  applicableTo: 'home' | 'away' | 'both';
}

export interface AppUser {
  displayName: string;
}
