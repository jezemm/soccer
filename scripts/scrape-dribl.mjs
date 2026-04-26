/**
 * Playwright scraper for the Dribl fixture page.
 * Uses puppeteer-extra-plugin-stealth to pass Cloudflare bot protection.
 *
 * Extracts per fixture:
 *   round, date, time, home_team_name, away_team_name,
 *   home_team_logo, away_team_logo, venue, map_url
 *
 * Output matches the format consumed by bulkSyncFixtures() in App.tsx.
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

const DRIBL_URL =
  'https://fv.dribl.com/fixtures/?date_range=default' +
  '&season=nPmrj2rmow&competition=Rxm8RpZLKr' +
  '&timezone=Australia%2FMelbourne';

const MONTH_MAP = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Parse "25 Apr 2026" → "2026-04-25" */
function parseDriblDate(text) {
  if (!text) return null;
  const m = text.trim().match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/i);
  if (!m) return null;
  const day = String(m[1]).padStart(2, '0');
  const month = MONTH_MAP[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${day}`;
}

/** Parse "09:15" → "09:15" (already HH:MM — just trim) */
function parseTime(text) {
  if (!text) return null;
  const m = text.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
}

/**
 * Runs inside the browser. Extracts cards whose IDs are not in seenIds[].
 * Returns new cards — caller merges seenIds with the returned IDs.
 * @param {string[]} seenIds
 */
function extractNewCards(seenIds) {
  const seen = new Set(seenIds);
  const cards = Array.from(document.querySelectorAll('[id^="fixture-"]'));
  const results = [];
  for (const card of cards) {
    const id = card.id;
    if (seen.has(id)) continue;

    const nameEls = Array.from(card.querySelectorAll('span.text-level-1.tw-font-medium'));
    const logoImgs = Array.from(card.querySelectorAll('img[class*="tw-w"]'));
    const mapAnchors = Array.from(card.querySelectorAll('a[href*="maps.google"]'));
    const venueAnchor = mapAnchors.find(a => a.textContent?.trim());
    const roundMatch = card.textContent?.match(/Round\s*(\d+)/i);

    results.push({
      id,
      homeTeam: nameEls[0]?.textContent?.trim() ?? null,
      awayTeam: nameEls[1]?.textContent?.trim() ?? null,
      homeLogo: logoImgs[0]?.src ?? null,
      awayLogo: logoImgs[1]?.src ?? null,
      dateText: card.querySelector('span.tw-font-normal')?.textContent?.trim() ?? null,
      timeText: card.querySelector('.text-level-3.pt-2')?.textContent?.trim() ?? null,
      mapUrl: mapAnchors[0]?.href ?? null,
      venue: venueAnchor?.textContent?.trim() ?? null,
      round: roundMatch ? roundMatch[1] : null,
    });
  }
  return results;
}

/** @returns {{ fixtures: object[], debug: object }} */
export async function scrapeDriblFixtures(url = DRIBL_URL) {
  // Non-headless avoids Cloudflare bot detection (a Chrome window will briefly appear)
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const debug = { url, totalCards: 0, pages: 1, error: null };

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Dismiss cookie banner if present
    try { await page.click('button.Cookie__button', { timeout: 2000 }); } catch {}

    // Collect cards incrementally — virtual scrolling removes off-screen nodes,
    // so we harvest each visible batch before scrolling past it.
    // seenIds is kept in Node.js and passed into each browser evaluate call.
    const seenIds = [];
    const raw = [];

    const harvest = async () => {
      const batch = await page.evaluate(extractNewCards, seenIds);
      for (const card of batch) seenIds.push(card.id);
      raw.push(...batch);
    };

    // Harvest first page
    await harvest();

    // Keep clicking "Load more..." until it's gone.
    // Wrapped in try/catch so a mid-loop failure still returns cards already harvested.
    try {
      while (true) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(800);

        const hasMore = await page.evaluate(() =>
          Array.from(document.querySelectorAll('div.d-flex.flex-column.justify-center'))
            .some(d => d.textContent?.includes('Load more...'))
        );
        if (!hasMore) break;

        const countBefore = await page.evaluate(() =>
          document.querySelectorAll('[id^="fixture-"]').length
        );

        // JS click bypasses any intercepting overlays
        await page.evaluate(() => {
          const el = Array.from(document.querySelectorAll('div.d-flex.flex-column.justify-center'))
            .find(d => d.textContent?.includes('Load more...'));
          if (el) el.click();
        });

        try {
          await page.waitForFunction(
            (n) => document.querySelectorAll('[id^="fixture-"]').length > n,
            countBefore,
            { timeout: 8000 }
          );
        } catch {
          break;
        }

        await harvest();
        debug.pages++;
      }
    } catch (loopErr) {
      debug.error = `Load-more loop: ${loopErr.message}`;
    }

    // Harvest any remaining cards visible after the last scroll
    await harvest();

    debug.totalCards = raw.length;

    // Convert to bulkSyncFixtures-compatible format
    const fixtures = raw.map(r => ({
      round: r.round,
      date: parseDriblDate(r.dateText),
      time: parseTime(r.timeText),
      home_team_name: r.homeTeam,
      away_team_name: r.awayTeam,
      home_team_logo: r.homeLogo,
      away_team_logo: r.awayLogo,
      venue: r.venue,
      map_url: r.mapUrl,
    }));

    return { fixtures, debug };
  } catch (err) {
    debug.error = err.message;
    throw err;
  } finally {
    await browser.close();
  }
}

// ── Competition scraper ──────────────────────────────────────────────────────

/**
 * Scrapes all competitions from fv.dribl.com by intercepting the API responses
 * the website makes when rendering its filter dropdowns.
 * Uses headless:true + stealth plugin.
 * @returns {{ competitions: Array<{id: string, name: string, season: string}>, debug: object }}
 */
export async function scrapeCompetitions() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const found = [];
  const debug = { intercepted: [], error: null };

  // Track the season ID from the seasons API response so we can attach it to competitions
  let defaultSeasonId = '';

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('mc-api.dribl.com')) return;
    debug.intercepted.push(url);
    try {
      const ct = response.headers()['content-type'] ?? '';
      if (!ct.includes('application/json')) return;

      // Capture the default season ID from the seasons endpoint
      if (url.includes('/seasons') && !defaultSeasonId) {
        const data = await response.json();
        const raw = Array.isArray(data) ? data : (data?.data ?? []);
        if (raw.length > 0) defaultSeasonId = String(raw[0]?.id ?? '');
        return;
      }

      // Only process the competitions list endpoint
      if (!url.match(/\/(?:list\/)?competitions/)) return;

      const data = await response.json();
      const raw = Array.isArray(data) ? data : (data?.data ?? data?.competitions ?? []);
      if (!Array.isArray(raw) || raw.length === 0) return;
      for (const c of raw) {
        const id = String(c.id ?? c.competition_id ?? '');
        const name = String(c.name ?? c.competition_name ?? c.short_name ?? '');
        // season comes from the URL param on the competitions request
        const seasonMatch = url.match(/[?&]season=([^&]+)/);
        const season = seasonMatch ? decodeURIComponent(seasonMatch[1]) : defaultSeasonId;
        if (id && name && !found.some(f => f.id === id)) {
          found.push({ id, name, season });
        }
      }
    } catch {}
  });

  try {
    await page.goto(
      'https://fv.dribl.com/fixtures/?date_range=default&timezone=Australia%2FMelbourne',
      { waitUntil: 'networkidle', timeout: 30_000 }
    );
    await page.waitForTimeout(3_000);

    // Fallback: if network didn't yield competitions, try clicking the dropdown
    if (found.length === 0) {
      const items = await scrapeDropdownItems(page, 'competition');
      for (const { name, url: itemUrl } of items) {
        const idMatch = itemUrl.match(/[?&]competition=([^&]+)/);
        const seasonMatch = itemUrl.match(/[?&]season=([^&]+)/);
        if (idMatch) found.push({ id: idMatch[1], name, season: seasonMatch?.[1] ?? '' });
      }
    }

    return { competitions: found, debug };
  } catch (err) {
    debug.error = err.message;
    throw err;
  } finally {
    await browser.close();
  }
}

// ── Club scraper ─────────────────────────────────────────────────────────────

/**
 * Scrapes clubs for a competition from fv.dribl.com via network interception.
 * Uses headless:true + stealth plugin.
 * @param {string} seasonId
 * @param {string} competitionId
 * @returns {{ clubs: Array<{id: string, name: string}>, debug: object }}
 */
export async function scrapeClubsForCompetition(seasonId, competitionId) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const found = [];
  const debug = { seasonId, competitionId, intercepted: [], error: null };

  // Capture the competition-filtered clubs endpoint (fixtures-clubs?competition=X).
  // The page also requests list/clubs (all clubs), which we skip.
  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('mc-api.dribl.com')) return;
    // Only process competition-specific club lists
    if (!url.includes('fixtures-clubs')) return;
    if (!url.includes(`competition=${competitionId}`)) return;
    debug.intercepted.push(url);
    try {
      const ct = response.headers()['content-type'] ?? '';
      if (!ct.includes('application/json')) return;
      const buf = await response.body();
      const data = JSON.parse(buf.toString());
      const raw = Array.isArray(data) ? data : (data?.data ?? data?.clubs ?? []);
      if (!Array.isArray(raw) || raw.length === 0) return;
      for (const c of raw) {
        const id = String(c.id ?? c.club_id ?? '');
        // JSON:API format: name is in attributes; flat format: directly on object
        const name = String(c.attributes?.name ?? c.name ?? c.club_name ?? c.short_name ?? '');
        if (id && name && !found.some(f => f.id === id)) {
          found.push({ id, name });
        }
      }
    } catch (e) {
      debug.handlerError = e.message;
    }
  });

  try {
    const pageUrl = `https://fv.dribl.com/fixtures/?date_range=default&season=${encodeURIComponent(seasonId)}&competition=${encodeURIComponent(competitionId)}&timezone=Australia%2FMelbourne`;
    debug.url = pageUrl;
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(3_000);

    return { clubs: found, debug };
  } catch (err) {
    debug.error = err.message;
    throw err;
  } finally {
    await browser.close();
  }
}

/**
 * Fallback: open a Vuetify filter dropdown, click each option, and capture the
 * resulting URL change to extract the option's ID.
 * @param {import('playwright').Page} page  Already-loaded fv.dribl.com page.
 * @param {'competition'|'club'} filterType
 * @returns {Promise<Array<{name: string, url: string}>>}
 */
async function scrapeDropdownItems(page, filterType) {
  const paramKey = filterType === 'competition' ? 'competition' : 'club';
  const results = [];
  try {
    // Vuetify v-select trigger — look for an input whose adjacent label mentions the filter type
    const trigger = await page.evaluateHandle((type) => {
      const labels = Array.from(document.querySelectorAll('label, .v-label'));
      for (const lbl of labels) {
        if (lbl.textContent?.toLowerCase().includes(type)) {
          const parent = lbl.closest('.v-input, .v-select, .v-autocomplete');
          if (parent) return parent.querySelector('input, .v-select__slot, .v-field__input') ?? parent;
        }
      }
      return null;
    }, filterType);

    const el = trigger.asElement();
    if (!el) return results;

    await el.click();
    await page.waitForTimeout(1_000);

    // Read all visible list items
    const names = await page.$$eval(
      '.v-menu__content .v-list-item__title, .v-overlay__content .v-list-item__title, ' +
      '.v-menu__content .v-list-item, .v-overlay__content .v-list-item',
      els => els.map(e => e.textContent?.trim()).filter(Boolean)
    );
    if (names.length === 0) return results;

    for (const name of names) {
      // Click the matching item
      const clicked = await page.evaluate((n) => {
        const selectors = [
          '.v-menu__content .v-list-item__title',
          '.v-overlay__content .v-list-item__title',
          '.v-menu__content .v-list-item',
          '.v-overlay__content .v-list-item',
        ];
        for (const sel of selectors) {
          const el = Array.from(document.querySelectorAll(sel))
            .find(e => e.textContent?.trim() === n);
          if (el) { el.click(); return true; }
        }
        return false;
      }, name);

      if (!clicked) continue;

      // Wait for URL to include the expected param
      try {
        await page.waitForURL(u => u.includes(`${paramKey}=`), { timeout: 4_000 });
        results.push({ name, url: page.url() });
      } catch {}

      // Re-open dropdown for the next item
      await el.click();
      await page.waitForTimeout(500);
    }
  } catch {}
  return results;
}

// ── CLI entry point ──────────────────────────────────────────────────────────
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const jsonMode = process.argv.includes('--json');
  const mode = process.argv.includes('--competitions') ? 'competitions'
    : process.argv.includes('--clubs') ? 'clubs'
    : 'fixtures';

  if (mode === 'competitions') {
    scrapeCompetitions()
      .then(result => {
        if (jsonMode) {
          process.stdout.write(JSON.stringify(result) + '\n');
        } else {
          console.log(`Competitions (${result.competitions.length}):`);
          result.competitions.forEach(c => console.log(`  ${c.id}  ${c.name}  season=${c.season}`));
        }
      })
      .catch(err => {
        if (jsonMode) process.stdout.write(JSON.stringify({ competitions: [], debug: { error: err.message } }) + '\n');
        else console.error('Failed:', err.message);
        process.exit(1);
      });

  } else if (mode === 'clubs') {
    const seasonIdx = process.argv.indexOf('--season');
    const compIdx = process.argv.indexOf('--competition');
    const seasonId = seasonIdx !== -1 ? process.argv[seasonIdx + 1] : '';
    const competitionId = compIdx !== -1 ? process.argv[compIdx + 1] : '';
    scrapeClubsForCompetition(seasonId, competitionId)
      .then(result => {
        if (jsonMode) {
          process.stdout.write(JSON.stringify(result) + '\n');
        } else {
          console.log(`Clubs (${result.clubs.length}):`);
          result.clubs.forEach(c => console.log(`  ${c.id}  ${c.name}`));
        }
      })
      .catch(err => {
        if (jsonMode) process.stdout.write(JSON.stringify({ clubs: [], debug: { error: err.message } }) + '\n');
        else console.error('Failed:', err.message);
        process.exit(1);
      });

  } else {
    const urlIdx = process.argv.indexOf('--url');
    const cliUrl = urlIdx !== -1 ? process.argv[urlIdx + 1] : DRIBL_URL;

    if (jsonMode) {
      scrapeDriblFixtures(cliUrl)
        .then(result => { process.stdout.write(JSON.stringify(result) + '\n'); })
        .catch(err => {
          process.stdout.write(JSON.stringify({ fixtures: [], debug: { error: err.message } }) + '\n');
          process.exit(1);
        });
    } else {
      console.log('Scraping Dribl fixtures…');
      scrapeDriblFixtures(cliUrl)
        .then(({ fixtures, debug }) => {
          console.log('\n── Debug ──');
          console.log(JSON.stringify(debug, null, 2));
          console.log(`\n── All fixtures (${fixtures.length}) ──`);
          const target = fixtures.filter(f =>
            (f.home_team_name || '').includes('EMJSC U8 Saturday White') ||
            (f.away_team_name || '').includes('EMJSC U8 Saturday White')
          );
          console.log(`EMJSC U8 Saturday White fixtures: ${target.length}`);
          console.log(JSON.stringify(target, null, 2));
        })
        .catch(err => {
          console.error('Scrape failed:', err.message);
          process.exit(1);
        });
    }
  }
}
