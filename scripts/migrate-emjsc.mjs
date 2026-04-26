/**
 * One-time migration: copy flat Firestore collections to multi-tenant paths.
 *
 * From: /games, /profiles, /feedback, etc.
 * To:   /clubs/emjsc/teams/u8-saturday-white/games, etc.
 *
 * Also:
 *   - Creates /accessCodes/emjsc2026
 *   - Creates /clubs/emjsc and /clubs/emjsc/teams/u8-saturday-white
 *   - Copies /faq → /global/faq (global FAQ source)
 *
 * Run: node scripts/migrate-emjsc.mjs
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var OR Firebase admin SDK service account.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

// Load firebase config for project ID
const firebaseConfig = JSON.parse(
  readFileSync(join(__dir, '..', 'firebase-applet-config.json'), 'utf8')
);

// Initialise admin SDK
if (!getApps().length) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
  } else {
    // Try local service account file
    const saPath = join(__dir, '..', 'service-account.json');
    try {
      const sa = JSON.parse(readFileSync(saPath, 'utf8'));
      initializeApp({ credential: cert(sa) });
    } catch {
      console.error('❌  Could not load service account credentials.');
      console.error('   Set GOOGLE_APPLICATION_CREDENTIALS env var or place service-account.json in project root.');
      process.exit(1);
    }
  }
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

const CLUB_ID = 'emjsc';
const TEAM_ID = 'u8-saturday-white';
const ACCESS_CODE = 'emjsc2026';
const TEAM_PATH = `clubs/${CLUB_ID}/teams/${TEAM_ID}`;

// Collections to migrate from flat → team-scoped
const TEAM_COLLECTIONS = [
  'games', 'profiles', 'feedback', 'messages', 'blocks',
  'announcements', 'availabilities', 'dutiesConfig', 'featureRequests', 'cafeCache',
];

// Settings documents to migrate
const SETTINGS_DOCS = ['training', 'passwords', 'squad', 'notifications', 'calendar', 'driblCache'];

async function copyCollection(srcPath, dstPath, label) {
  const snap = await db.collection(srcPath).get();
  if (snap.empty) { console.log(`  ⚠️  ${label}: empty, skipping`); return 0; }
  let count = 0;
  const BATCH_SIZE = 400;
  let batch = db.batch();
  for (const docSnap of snap.docs) {
    batch.set(db.collection(dstPath).doc(docSnap.id), docSnap.data());
    count++;
    if (count % BATCH_SIZE === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`  ✓  ${label}: ${count} docs copied`);
  return count;
}

async function copyDoc(srcPath, dstPath, label) {
  const snap = await db.doc(srcPath).get();
  if (!snap.exists) { console.log(`  ⚠️  ${label}: not found, skipping`); return; }
  await db.doc(dstPath).set(snap.data());
  console.log(`  ✓  ${label}: copied`);
}

async function main() {
  console.log(`\n🚀  EMJSC Multi-Tenant Migration`);
  console.log(`   Target: ${TEAM_PATH}\n`);

  // 1. Create club document
  console.log('1. Creating club document...');
  await db.doc(`clubs/${CLUB_ID}`).set({
    name: 'East Malvern Junior Soccer Club',
    shortName: 'EMJSC',
    logoUrl: '',
    driblClubId: 'east-malvern',
    createdAt: new Date(),
  });
  console.log(`  ✓  clubs/${CLUB_ID} created`);

  // 2. Create team document
  console.log('\n2. Creating team document...');
  await db.doc(TEAM_PATH).set({
    name: 'EMJSC U8 Saturday White',
    shortName: 'EMJSC',
    season: '2026',
    driblTeamName: 'EMJSC U8 Saturday White',
    homeGround: 'Central Park, Malvern VIC',
    trainingLocation: 'Gardiner Park',
    accessCode: ACCESS_CODE,
    teamLogoUrl: '',
    messagingEnabled: true,
  });
  console.log(`  ✓  ${TEAM_PATH} created`);

  // 3. Create access code lookup
  console.log('\n3. Creating access code...');
  await db.doc(`accessCodes/${ACCESS_CODE}`).set({ clubId: CLUB_ID, teamId: TEAM_ID });
  console.log(`  ✓  accessCodes/${ACCESS_CODE} → ${CLUB_ID}/${TEAM_ID}`);

  // 4. Copy team collections
  console.log('\n4. Copying team collections...');
  for (const col of TEAM_COLLECTIONS) {
    await copyCollection(col, `${TEAM_PATH}/${col}`, col);
  }

  // 5. Copy settings documents
  console.log('\n5. Copying settings documents...');
  for (const docName of SETTINGS_DOCS) {
    await copyDoc(`settings/${docName}`, `${TEAM_PATH}/settings/${docName}`, `settings/${docName}`);
  }

  // 6. Copy FAQ to global (source of truth for all teams)
  console.log('\n6. Copying FAQ to global...');
  await copyCollection('faq', 'global/faq', 'faq → global/faq');

  console.log('\n✅  Migration complete!');
  console.log(`\n   Team hub URL: ${process.env.APP_URL || 'https://your-app.web.app'}/?t=${ACCESS_CODE}`);
  console.log('\n   ⚠️  Old flat collections have NOT been deleted.');
  console.log('   Once you\'ve validated the migrated data, run the cleanup script.');
}

main().catch(e => { console.error('\n❌  Migration failed:', e); process.exit(1); });
