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
  '&season=nPmrj2rmow&competition=Rxm8RpZLKr&club=3pmvQzZrdv' +
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
export async function scrapeDriblFixtures() {
  // Non-headless avoids Cloudflare bot detection (a Chrome window will briefly appear)
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const debug = { url: DRIBL_URL, totalCards: 0, pages: 1, error: null };

  try {
    await page.goto(DRIBL_URL, { waitUntil: 'networkidle', timeout: 30000 });
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

// ── CLI entry point ──────────────────────────────────────────────────────────
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const jsonMode = process.argv.includes('--json');

  if (jsonMode) {
    // Machine-readable mode: emit only a single JSON line to stdout.
    scrapeDriblFixtures()
      .then(result => { process.stdout.write(JSON.stringify(result) + '\n'); })
      .catch(err => {
        process.stdout.write(JSON.stringify({ fixtures: [], debug: { error: err.message } }) + '\n');
        process.exit(1);
      });
  } else {
    // Human-readable mode for direct CLI use.
    console.log('Scraping Dribl fixtures…');
    scrapeDriblFixtures()
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
