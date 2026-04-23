export const TEAM_SQUAD = [
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

export const CLUB_LOGO = "https://emjs.club/vic/sjsc/uploads/images/emjsc%20logo%20svg%20jp.svg";

export const AVATAR_COLORS = ['#e31e24','#1a2e5a','#7c3aed','#16a34a','#d97706','#2563eb','#db2777','#0d9488','#ea580c','#0891b2'];

export function splitOpponent(name: string): { club: string; team: string } {
  const idx = name.indexOf(' - ');
  if (idx === -1) return { club: '', team: name.trim() };
  return { club: name.slice(0, idx).trim(), team: name.slice(idx + 3).trim() };
}

export function playerAvatar(name: string): string {
  const hash = (name || '').split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xfffffff, 0);
  const bg = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><text x="50" y="68" text-anchor="middle" font-size="52">⚽</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const getNextTrainingDate = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = (3 - day + 7) % 7;
  const nextWed = new Date(now);
  nextWed.setDate(now.getDate() + (diff === 0 ? 0 : diff));
  return nextWed.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
};

export const getNextSaturday = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = (6 - day + 7) % 7;
  const nextSat = new Date(now);
  nextSat.setDate(now.getDate() + (diff === 0 ? 0 : diff));
  nextSat.setHours(0, 0, 0, 0);
  return nextSat;
};

export const getTravelTime = (location: string) => {
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
  return "15-25 mins";
};

export const SEED_FAQS: Array<{ id: string; question: string; answer: string; order: number }> = [
  { id: 'faq_getting_started', question: 'How do I get started?', answer: 'When you first open the app, tap your name from the squad list to sign in — no password needed. Once you\'ve selected your name you\'ll land on the Schedule page, which is the main hub for everything happening with the team. Your name is saved on your device so you won\'t need to choose it again next time.', order: 1 },
  { id: 'faq_schedule', question: 'How do I view upcoming matches?', answer: 'Open the Schedule tab (calendar icon). The very next match is shown at the top as a large "Next Match" card with the full details front and centre. All upcoming games are listed below it in date order. Tap any match card to open the full game details, including kick-off time, when to arrive, location, and which duties still need to be filled.', order: 2 },
  { id: 'faq_next_match_card', question: 'What does the Next Match card show me?', answer: 'The Next Match card shows everything you need for the upcoming game: the opponent name, whether it is home or away, the ground location (tap it for Google Maps directions), kick-off time, your recommended arrival time (30 minutes before kick-off), a travel time estimate from the home ground, a summary of which duties have been filled, and your own availability toggle.', order: 3 },
  { id: 'faq_directions', question: 'How do I get directions to the match ground?', answer: 'Tap the location text on any match card or game detail screen — it has a red map pin icon next to it. This opens Google Maps with turn-by-turn navigation to the ground already set as the destination. It works from wherever you are at the time.', order: 4 },
  { id: 'faq_availability', question: 'How do I mark myself as available or unavailable for a match?', answer: 'Every match card has an availability toggle — a small pill switch that shows "Available to Play" in green or "Unavailable to Play" in red. Tap it once to flip your status. The change saves instantly and the coach and other parents can see it straight away. Please update this as early as possible so the coach can plan the team and duties accordingly.', order: 5 },
  { id: 'faq_duties_what', question: 'What are match day duties?', answer: 'Match day duties are volunteer roles that parents help fill each game. Typical duties include Goalie (in goal for the match), Snacks (bringing the half-time snack for the team), Referee (officiating the match), and Pitch Marshal (managing the sideline). Each duty has a tile on the match card. The team relies on parents stepping up — it only takes a moment to claim one.', order: 6 },
  { id: 'faq_duties_claim', question: 'How do I claim a duty?', answer: 'Find the duty tile you want on the match card or game details screen. If the tile shows "Claim", tap it and your name will appear on that duty. The tile updates instantly for everyone so they know that role is covered. If a tile shows another parent\'s name, that slot is already taken. You cannot take a duty from someone who has not requested a swap.', order: 7 },
  { id: 'faq_swap_request', question: 'I\'m assigned to a duty but can\'t make it — how do I request a swap?', answer: 'Find your duty tile — it shows your name with a small swap icon (⇄). Tap the tile to request a swap. The tile will turn orange and show "Swap Needed" so other parents know you need someone to step in. To cancel the request and keep the duty yourself, just tap the tile again. Please request a swap as soon as you know you can\'t make it so someone has time to pick it up.', order: 8 },
  { id: 'faq_swap_take', question: 'How do I take over a duty when someone has requested a swap?', answer: 'When a parent has requested a swap, their duty tile turns orange and shows "Take It". Simply tap "Take It" to take on the duty — your name will replace theirs and the swap request clears. You\'ll only see "Take It" on duties where a swap has been requested.', order: 9 },
  { id: 'faq_training', question: 'How will I know if training is cancelled?', answer: 'If the coach or team manager cancels training, a prominent red banner will appear at the top of the Schedule page as soon as you open the app. Always check the app before leaving for training, especially in bad weather. The banner disappears once training is back on as normal.', order: 10 },
  { id: 'faq_announcements', question: 'What are Announcements and where do I find them?', answer: 'Announcements are messages and goals posted by the coach for the whole team. They appear as cards at the top of the Schedule page, above the match list. A blue card is a general team message; a gold card is a team goal or achievement the coach wants to highlight. Scroll up on the Schedule page if you don\'t see them — they sit above the Next Match card.', order: 11 },
  { id: 'faq_profile', question: 'How do I set up my profile?', answer: 'Tap the My Profile tab (person icon). You can write a short bio about yourself or your child — for example their position, how long they\'ve been playing, or a fun fact. Your profile is visible to other squad members in the Squad tab. Tap "Edit Bio" to update it at any time.', order: 12 },
  { id: 'faq_squad', question: 'What is the Squad tab?', answer: 'The Squad tab shows all the players and parents registered with the team. Tap any card to see their profile including their bio. If messaging is enabled you can also tap "Message" from their profile to start a private conversation. It\'s a good way to put names to faces before a match, especially if you\'re new to the team.', order: 13 },
  { id: 'faq_contact', question: 'Something isn\'t working — who do I contact?', answer: 'If something isn\'t behaving correctly, try refreshing the page first. If the problem persists, reach out to the team manager — message them via the Messages tab (look for "Team Manager" at the top of the contacts list) or contact them through your usual team channel. Screenshots are always helpful when reporting issues.', order: 14 },
];
