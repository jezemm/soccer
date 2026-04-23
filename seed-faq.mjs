// Run with: node seed-faq.mjs
// Uses the Firebase CLI OAuth token stored locally — no service account needed.
import { readFileSync } from 'fs';
import { homedir } from 'os';

const PROJECT  = 'gen-lang-client-0029897959';
const DATABASE = 'ai-studio-d1fcc763-4ce4-4bde-b121-8a73822ddcd3';
const BASE     = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DATABASE}/documents`;

function getToken() {
  const cfg = JSON.parse(readFileSync(`${homedir()}/.config/configstore/firebase-tools.json`, 'utf8'));
  const token = cfg?.tokens?.access_token;
  if (!token) throw new Error('No Firebase CLI token found — run: firebase login');
  return token;
}

const TOKEN = getToken();
const AUTH  = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

const FAQS = [
  { id: 'faq_getting_started', order: 1,
    question: 'How do I get started?',
    answer: "When you first open the app, tap your name from the squad list to sign in — no password needed. Once you've selected your name you'll land on the Schedule page, which is the main hub for everything happening with the team. Your name is saved on your device so you won't need to choose it again next time." },

  { id: 'faq_schedule', order: 2,
    question: 'How do I view upcoming matches?',
    answer: 'Open the Schedule tab (calendar icon). The very next match is shown at the top as a large "Next Match" card with the full details front and centre. All upcoming games are listed below it in date order. Tap any match card to open the full game details, including kick-off time, when to arrive, location, and which duties still need to be filled.' },

  { id: 'faq_next_match_card', order: 3,
    question: 'What does the Next Match card show me?',
    answer: 'The Next Match card shows everything you need for the upcoming game: the opponent name, whether it is home or away, the ground location (tap it for Google Maps directions), kick-off time, your recommended arrival time (30 minutes before kick-off), a travel time estimate from the home ground, a summary of which duties have been filled, and your own availability toggle.' },

  { id: 'faq_directions', order: 4,
    question: 'How do I get directions to the match ground?',
    answer: 'Tap the location text on any match card or game detail screen — it has a red map pin icon next to it. This opens Google Maps with turn-by-turn navigation to the ground already set as the destination. It works from wherever you are at the time.' },

  { id: 'faq_availability', order: 5,
    question: 'How do I mark myself as available or unavailable for a match?',
    answer: 'Every match card has an availability toggle — a small pill switch that shows "Available to Play" in green or "Unavailable to Play" in red. Tap it once to flip your status. The change saves instantly and the coach and other parents can see it straight away. Please update this as early as possible so the coach can plan the team and duties accordingly.' },

  { id: 'faq_duties_what', order: 6,
    question: 'What are match day duties?',
    answer: 'Match day duties are volunteer roles that parents help fill each game. Typical duties include Goalie (in goal for the match), Snacks (bringing the half-time snack for the team), Referee (officiating the match), and Pitch Marshal (managing the sideline). Each duty has a tile on the match card. The team relies on parents stepping up — it only takes a moment to claim one.' },

  { id: 'faq_duties_claim', order: 7,
    question: 'How do I claim a duty?',
    answer: "Find the duty tile you want on the match card or game details screen. If the tile shows \"Claim\", tap it and your name will appear on that duty. The tile updates instantly for everyone so they know that role is covered. If a tile shows another parent's name, that slot is already taken. You cannot take a duty from someone who has not requested a swap." },

  { id: 'faq_swap_request', order: 8,
    question: "I'm assigned to a duty but can't make it — how do I request a swap?",
    answer: 'Find your duty tile — it shows your name with a small swap icon (⇄). Tap the tile to request a swap. The tile will turn orange and show "Swap Needed" so other parents know you need someone to step in. To cancel the request and keep the duty yourself, just tap the tile again. Please request a swap as soon as you know you cannot make it so someone has time to pick it up.' },

  { id: 'faq_swap_take', order: 9,
    question: 'How do I take over a duty when someone has requested a swap?',
    answer: 'When a parent has requested a swap, their duty tile turns orange and shows "Take It". Simply tap "Take It" to take on the duty — your name will replace theirs and the swap request clears. You will only see "Take It" on duties where a swap has been requested.' },

  { id: 'faq_training', order: 10,
    question: 'How will I know if training is cancelled?',
    answer: 'If the coach or team manager cancels training, a prominent red banner will appear at the top of the Schedule page as soon as you open the app. Always check the app before leaving for training, especially in bad weather. The banner disappears once training is back on as normal.' },

  { id: 'faq_announcements', order: 11,
    question: 'What are Announcements and where do I find them?',
    answer: 'Announcements are messages and goals posted by the coach for the whole team. They appear as cards at the top of the Schedule page, above the match list. A blue card is a general team message; a gold card is a team goal or achievement the coach wants to highlight. Scroll up on the Schedule page if you do not see them — they sit above the Next Match card.' },

  { id: 'faq_match_wrap', order: 12,
    question: "How do I see the coach's post-match notes?",
    answer: 'After a match, the coach can post a Match Wrap — a note about the game for the whole team. Open the match from the Schedule tab and scroll down to find it below the match details. It might include highlights, things to work on, or a well done message. Past matches stay in the schedule so you can always look back.' },

  { id: 'faq_feedback', order: 13,
    question: 'How do I leave match feedback?',
    answer: 'Open any match from the Schedule and scroll down to the Feedback section. Tap "Add Feedback" to write your notes — you can log goals scored and any comments about how the match went. The coach can review all feedback from the Admin panel to help with planning and player development.' },

  { id: 'faq_messaging', order: 14,
    question: 'How do I send a message to another parent or team member?',
    answer: 'Open the Messages tab (speech bubble icon). You will see a contacts list with all squad members, plus the Coach and Team Manager at the top. Tap any name to open a private chat thread. Type your message and tap the send button. Messages are private between you and that person. Note: messaging must be enabled by the team manager for this feature to be available.' },

  { id: 'faq_profile', order: 15,
    question: 'How do I set up my profile?',
    answer: "Tap the My Profile tab (person icon). You can write a short bio about yourself or your child — for example their position, how long they've been playing, or a fun fact. Your profile is visible to other squad members in the Squad tab. Tap \"Edit Bio\" to update it at any time." },

  { id: 'faq_squad', order: 16,
    question: 'What is the Squad tab?',
    answer: "The Squad tab shows all the players and parents registered with the team. Tap any card to see their profile including their bio. If messaging is enabled you can also tap \"Message\" from their profile to start a private conversation. It's a good way to put names to faces before a match, especially if you're new to the team." },

  { id: 'faq_admin', order: 17,
    question: "I'm the team manager — how do I access admin features?",
    answer: 'Tap the Admin tab (gear icon) in the navigation menu and enter the admin password. Once unlocked, you have access to: Match Day (add/edit fixtures, travel times, training toggle), Coach Wrap (post team announcements), Duty Manager (configure duty types), FAQ (edit this help content), and Settings (home ground, messaging toggle, coach exemptions). Admin access is saved on your device.' },

  { id: 'faq_contact', order: 18,
    question: "Something isn't working — who do I contact?",
    answer: 'If something is not behaving correctly, try refreshing the page first. If the problem persists, reach out to the team manager — message them via the Messages tab (look for "Team Manager" at the top of the contacts list) or contact them through your usual team channel. Screenshots are always helpful when reporting issues.' },
];

function toFields(data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string')  fields[k] = { stringValue: v };
    if (typeof v === 'number')  fields[k] = { integerValue: String(v) };
  }
  return { fields };
}

async function listExisting() {
  const res = await fetch(`${BASE}/faq`, { headers: AUTH });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.documents || []).map(d => d.name.split('/').pop());
}

async function deleteDoc(id) {
  const res = await fetch(`${BASE}/faq/${id}`, { method: 'DELETE', headers: AUTH });
  if (!res.ok && res.status !== 404) throw new Error(`DELETE ${id}: ${res.status}`);
}

async function upsertDoc(id, data) {
  const res = await fetch(`${BASE}/faq/${id}`, {
    method: 'PATCH',
    headers: AUTH,
    body: JSON.stringify(toFields(data)),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PATCH ${id}: ${res.status} ${body}`);
  }
}

async function seed() {
  console.log('Listing existing FAQ documents…');
  const existing = await listExisting();
  if (existing.length > 0) {
    console.log(`Deleting ${existing.length} existing items (${existing.join(', ')})…`);
    for (const id of existing) await deleteDoc(id);
  }

  console.log(`Writing ${FAQS.length} FAQ items…`);
  for (const { id, ...data } of FAQS) {
    await upsertDoc(id, data);
    process.stdout.write(` ✓ ${id}\n`);
  }
  console.log(`\n✅ Done — ${FAQS.length} FAQ items written to Firestore.`);
}

seed().catch(err => { console.error('\n❌', err.message); process.exit(1); });
