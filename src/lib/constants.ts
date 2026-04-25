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

export const SEED_FAQS: Array<{ id: string; question: string; answer: string; order: number; visibleTo: string[] }> = [
  {
    id: 'faq_sign_in',
    question: 'How do I sign in?',
    answer: 'When you first open the hub, tap your name from the squad list. You\'ll then be asked to enter your player password — your team manager will have given this to you. Once signed in your session is saved on the device, so you won\'t need to sign in again unless you log out.',
    order: 1,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_schedule',
    question: 'How do I see upcoming matches?',
    answer: 'Open the Schedule tab (calendar icon at the bottom). The next upcoming match is shown as a large card at the top. All remaining fixtures are listed below in date order. Tap any match card to open the full game detail — kick-off time, arrival time, location, duty assignments, and unavailable players.',
    order: 2,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_next_match',
    question: 'What does the Next Match card show?',
    answer: 'The Next Match card shows the opponent club and team, whether it is a home or away game, the venue (tap it for Google Maps directions), kick-off time, your recommended arrival time (30 minutes before kick-off), an estimated travel time for away games, a summary of which duties are filled or still needed, and your availability toggle.',
    order: 3,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_directions',
    question: 'How do I get directions to a ground?',
    answer: 'Tap the red map pin icon and venue name on any match card or game detail screen. This opens Google Maps with the ground already set as your destination so you can get turn-by-turn directions from wherever you are.',
    order: 4,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_availability',
    question: 'How do I mark myself as unavailable for a match?',
    answer: 'Every match card and the game detail screen has a green/red pill toggle. Tap it to switch between "Available to Play" (green) and "Unavailable to Play" (red). The change is instant and visible to the coach and other parents straight away. Please update this as early as possible so the coach can plan accordingly. Matches where you\'ve marked yourself unavailable are shown dimmed in the fixture list.',
    order: 5,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_duties_what',
    question: 'What are match day duties?',
    answer: 'Duties are the volunteer roles that keep match day running. Player duties include Goalie (1st Half) and Goalie (2nd Half) — a player takes a turn in goal each half. Parent duties include Match Day Snacks (bringing a half-time treat for the team), Referee (officiating the match), and Pitch Marshal (managing the sideline). Referee and Pitch Marshal only apply to home games. Each match card shows a tile for every applicable duty.',
    order: 6,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_duties_claim',
    question: 'How do I claim a duty?',
    answer: 'On any match card or game detail screen, find the duty tile you want to take. If it shows "Claim", tap it — your name appears on that duty immediately and it updates for everyone. If a tile already shows someone\'s name (and they haven\'t requested a swap), that slot is taken and you\'ll see "Taken" instead.',
    order: 7,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_swap_request',
    question: 'I\'ve been assigned a duty but can\'t make it — how do I request a swap?',
    answer: 'Find your duty tile — it shows your name with a swap icon (⇄). Tap it to request a swap. The tile turns orange and shows "Swap Needed" so other parents can see you need someone to step in. To cancel the request, tap the tile again. Please request a swap as soon as you know so there\'s time for someone to pick it up.',
    order: 8,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_swap_take',
    question: 'How do I take a duty when someone has requested a swap?',
    answer: 'When a swap has been requested, the duty tile turns orange and shows "Take It". Tap "Take It" to take over — your name replaces theirs and the swap request clears automatically.',
    order: 9,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_training',
    question: 'How will I know if training is cancelled?',
    answer: 'If the coach or manager cancels training, a bold red banner appears at the very top of the app the moment you open it. Always check before leaving for training, especially in poor weather. The banner disappears automatically once training is back on.',
    order: 10,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_announcements',
    question: 'Where do I find team announcements?',
    answer: 'Announcements from the coach appear as cards at the very top of the Schedule page, above the Next Match card. A blue card is a general team message or update; a gold card highlights a team goal or achievement. Scroll up if you don\'t see them straight away.',
    order: 11,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_squad',
    question: 'What is the Squad tab?',
    answer: 'The Squad tab (people icon) lists every player in the team with their profile photo and bio. Tap a player\'s card to read their profile. If messaging is enabled you can also start a private chat from their profile page. It\'s a great way to put names to faces, especially at the start of a new season.',
    order: 12,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_messages',
    question: 'How does messaging work?',
    answer: 'If the Messages tab is visible (speech bubble icon), you can send private messages to other players and parents in the squad. Tap the tab to see your conversations — unread messages show a badge count on the icon. Tap a contact to open the chat. The coach and manager can also send messages to individuals from within the admin area.',
    order: 13,
    visibleTo: ['player', 'coach', 'manager'],
  },
  {
    id: 'faq_contact',
    question: 'Something isn\'t working — who do I contact?',
    answer: 'Try refreshing the page first. If the problem persists, message the team manager or coach via the Messages tab, or reach out through your usual team channel. A screenshot of what you\'re seeing is always helpful.',
    order: 14,
    visibleTo: ['player', 'coach', 'manager'],
  },

  // --- Admin / Coach FAQs ---
  {
    id: 'faq_admin_access',
    question: 'How do I access the Admin area?',
    answer: 'Tap the Admin button in the top-right corner of the login page, select your name from the dropdown, enter your password, and tap Sign In. Once logged in you\'ll see an Admin tab (cog icon) in the navigation. Tap it to open the Admin Hub, which contains all management tools.',
    order: 15,
    visibleTo: ['coach', 'manager'],
  },
  {
    id: 'faq_admin_matches',
    question: 'How do I add or edit a match?',
    answer: 'Go to Admin → Schedule tab. Use the Add Match section to create a new fixture — fill in the opponent, venue, date and kick-off time, and whether it\'s a home or away game, then tap "Add Match to Schedule". To edit an existing match, select it from the Match Detail Editor dropdown and update the fields, then tap "Update Match Details". You can also delete a match from the same screen.',
    order: 16,
    visibleTo: ['coach', 'manager'],
  },
  {
    id: 'faq_admin_bulk_sync',
    question: 'How do I bulk-import fixtures from a JSON file?',
    answer: 'In Admin → Schedule, scroll down to the Fixture Integration section. Paste your fixture JSON into the text area and tap "Sync New Fixtures". The app will add any new games found in the JSON without overwriting existing ones. Use "Wipe Full Schedule" only if you need to start fresh — this permanently deletes all matches.',
    order: 17,
    visibleTo: ['coach', 'manager'],
  },
  {
    id: 'faq_admin_duties_config',
    question: 'How do I set up or change the duties?',
    answer: 'Go to Admin → Duties tab, then scroll to the Team Duty Settings section. You can add a custom duty by entering a name, choosing whether it applies to players or parents, setting whether it\'s for home games, away games, or both, and picking an emoji. Tap "Add Duty" to save it. Use "Create Default Duties" to load the standard set (Goalie 1st/2nd Half, Match Day Snacks, Referee, Pitch Marshal) if you haven\'t set any up yet. You can edit or delete duties at any time.',
    order: 18,
    visibleTo: ['coach', 'manager'],
  },
  {
    id: 'faq_admin_auto_allocate',
    question: 'How does Smart Allocate Duties work?',
    answer: 'Go to Admin → Duties and tap "Smart Allocate Duties". The system looks at every upcoming game and assigns any unfilled duties automatically, spreading the load as evenly as possible across the squad while respecting the Coach\'s Child Exemption. It won\'t overwrite duties that are already assigned. Use "Wipe All Assignments" first if you want to start the allocation from scratch.',
    order: 19,
    visibleTo: ['coach', 'manager'],
  },
  {
    id: 'faq_admin_coach_child',
    question: 'What is the Coach\'s Child Exemption?',
    answer: 'In Admin → Duties, scroll to the Coach\'s Child Duty Exemption section. Select the player who is the coach\'s child, then tick the duties you want to exclude them from (typically the goalie duties). The smart allocation and any manual assignments will skip that player for the ticked duties.',
    order: 20,
    visibleTo: ['coach', 'manager'],
  },
  {
    id: 'faq_admin_duty_tally',
    question: 'How do I see who has done the most duties?',
    answer: 'In Admin → Duties, scroll down to the Duty Distribution Tally table. It shows each player\'s count per duty type and a total across the season. The table is sorted by total duties descending so you can quickly spot if someone has been assigned more than their fair share.',
    order: 21,
    visibleTo: ['coach', 'manager'],
  },
  {
    id: 'faq_admin_announcements',
    question: 'How do I post a team announcement?',
    answer: 'Go to Admin → Comms tab. Type your message in the text box, choose the type — "Message" for a general update (shown as a blue card) or "Goal" for a team achievement (shown as a gold card) — then tap "Post Announcement". Announcements appear immediately at the top of the Schedule page for all squad members. You can edit or delete any announcement from the same screen.',
    order: 22,
    visibleTo: ['coach', 'manager'],
  },
  {
    id: 'faq_admin_training',
    question: 'How do I cancel or reopen training?',
    answer: 'Go to Admin → Schedule tab. At the top of the page there is a Training Status toggle. Tap "Cancel" to mark training as cancelled — a red banner will appear at the top of the app for all users immediately. Tap "Open" to clear the cancellation. Always double-check after toggling so you don\'t accidentally leave training cancelled.',
    order: 23,
    visibleTo: ['coach', 'manager'],
  },
  {
    id: 'faq_admin_squad',
    question: 'How do I add, rename, or remove a player?',
    answer: 'Go to Admin → Squad tab. The Players section lists every current squad member. Tap the pencil icon to rename a player or update their bio — renaming automatically migrates their password. Tap the bin icon to remove a player (you\'ll be asked to confirm). To add a new player, scroll down to the Add Player section, enter their name and an optional bio, and tap "Add Player".',
    order: 24,
    visibleTo: ['manager'],
  },
  {
    id: 'faq_admin_passwords',
    question: 'How do I set or reset a player\'s password?',
    answer: 'Go to Admin → Squad tab and find the player in the list. Tap the pencil (edit) icon — the edit form includes a password field where you can type a new password for that player. Tap Save. Players can also change their own password from their card on the Squad page once they are logged in.',
    order: 25,
    visibleTo: ['manager'],
  },
  {
    id: 'faq_admin_staff',
    question: 'How do I add or manage staff accounts (coaches and admins)?',
    answer: 'Go to Admin → Squad tab and scroll to the Staff Accounts section. The table shows all current staff with their name, role, and a masked password. Tap the pencil icon to edit a name, role, or password. Tap the bin icon to remove an account (at least one account must always remain). To add a new staff member, tap "Add Staff Account", fill in the details, and tap Save.',
    order: 26,
    visibleTo: ['manager'],
  },
  {
    id: 'faq_admin_faq',
    question: 'How do I manage the Help & FAQ content?',
    answer: 'Go to Admin → FAQ tab. You can add new questions, edit existing ones, reorder them using the up/down arrows, and delete items. Each FAQ has a "Visible To" setting — tick Players, Coaches, and/or Admins to control who sees it. Tap "Reset to Defaults" to restore the original FAQ set (this overwrites any custom items). Changes take effect immediately for all users.',
    order: 27,
    visibleTo: ['manager'],
  },
];
