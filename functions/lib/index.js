"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeDribl = exports.cafesNearby = exports.travelTime = exports.fixturesICS = void 0;
// Must be first — forces Date local methods to use Melbourne time
process.env.TZ = "Australia/Melbourne";
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const playwright_extra_1 = require("playwright-extra");
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
playwright_extra_1.chromium.use((0, puppeteer_extra_plugin_stealth_1.default)());
(0, app_1.initializeApp)();
const DATABASE_ID = "ai-studio-d1fcc763-4ce4-4bde-b121-8a73822ddcd3";
const TZID = "Australia/Melbourne";
function pad(n) {
    return String(n).padStart(2, "0");
}
function toLocal(d) {
    return (`${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
        `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`);
}
function toUtcStamp(d) {
    return (`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
        `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`);
}
// Escape ICS special chars; real newlines become \n (interpreted by calendar apps)
function escIcs(s) {
    return s
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");
}
function splitOpponent(opponent) {
    const idx = opponent.indexOf(" - ");
    if (idx === -1)
        return { club: "", team: opponent };
    return { club: opponent.slice(0, idx), team: opponent.slice(idx + 3) };
}
function getVenueName(location) {
    const m = location.match(/^(.*\b(?:Reserve|Park|Ground|Oval|Centre|Center|Stadium))\b/i);
    if (m)
        return m[1].trim();
    return location.replace(/\s+(?:Pitch|Field|Midi|Half|Court|\d).*$/i, "").trim() || location;
}
function formatVenueDisplay(location) {
    const venue = getVenueName(location);
    const pitch = location.slice(venue.length).trim();
    return pitch ? `${venue} - ${pitch}` : location;
}
const DEFAULT_DUTIES = [
    { id: "goalie", label: "Goalie (1st Half)", emoji: "", applicableTo: "both" },
    { id: "goalie_2", label: "Goalie (2nd Half)", emoji: "", applicableTo: "both" },
    { id: "snack_provider", label: "Match Day Snacks", emoji: "", applicableTo: "both" },
    { id: "referee", label: "Referee", emoji: "", applicableTo: "home" },
    { id: "pitch_marshal", label: "Pitch Marshall", emoji: "", applicableTo: "home" },
];
exports.fixturesICS = (0, https_1.onRequest)({ region: "australia-southeast1", cors: true }, async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const db = (0, firestore_1.getFirestore)(DATABASE_ID);
        const [gamesSnap, dutiesSnap, calendarSnap] = await Promise.all([
            db.collection("games").orderBy("date", "asc").get(),
            db.collection("dutiesConfig").get(),
            db.collection("settings").doc("calendar").get(),
        ]);
        // Always use document ID as authoritative id (id in data may differ)
        const duties = dutiesSnap.empty
            ? DEFAULT_DUTIES
            : dutiesSnap.docs.map((d) => (Object.assign(Object.assign({}, d.data()), { id: d.id })));
        const calendarData = calendarSnap.exists ? calendarSnap.data() : null;
        const calendarVersion = (_a = calendarData === null || calendarData === void 0 ? void 0 : calendarData.version) !== null && _a !== void 0 ? _a : 0;
        const calendarUpdatedAt = (_d = (_c = (_b = calendarData === null || calendarData === void 0 ? void 0 : calendarData.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) !== null && _d !== void 0 ? _d : new Date();
        const now = toUtcStamp(new Date());
        const lastModified = toUtcStamp(calendarUpdatedAt);
        const events = [];
        gamesSnap.forEach((doc) => {
            const g = doc.data();
            if (!g.date)
                return;
            const start = new Date(g.date);
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            const arrival = new Date(start.getTime() - 30 * 60 * 1000);
            const arrivalTime = arrival.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
            const kickoffTime = start.toLocaleTimeString("en-AU", {
                hour: "2-digit",
                minute: "2-digit",
            });
            const { club, team } = splitOpponent(g.opponent || "");
            const opponentShort = club || team || g.opponent || "TBC";
            // Duties applicable to this game
            const applicableDuties = duties.filter((d) => {
                const at = d.applicableTo;
                if (!at || at === "both")
                    return true;
                if (at === "home" && g.isHome)
                    return true;
                if (at === "away" && !g.isHome)
                    return true;
                return false;
            });
            const dutyLines = applicableDuties.map((d) => {
                const assignee = (g.assignments && g.assignments[d.id]) || null;
                const prefix = d.emoji ? `${d.emoji} ` : "";
                return `${prefix}${d.label}: ${assignee || "Volunteer needed"}`;
            });
            // Location string — venue name + city for Apple/Google Maps geocoding
            const locationName = g.location || "";
            const venueName = locationName ? getVenueName(locationName) : "";
            const locationFull = venueName
                ? `${venueName}, Melbourne VIC, Australia`
                : "";
            // Google Maps search link for the description
            const mapsUrl = g.mapUrlOverride ||
                (venueName
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName + " Melbourne VIC")}`
                    : null);
            // Build description with real newlines — escIcs converts them to \n
            const lines = [
                `${g.isHome ? "🏠 Home Match" : "✈️ Away Match"}`,
                `📍 ${locationName ? formatVenueDisplay(locationName) : "TBC"}`,
                `⏰ Kick-off ${kickoffTime} · Arrive by ${arrivalTime}`,
            ];
            if (g.travelTimeMinutes) {
                lines.push(`🚗 Travel time: ~${g.travelTimeMinutes} min`);
            }
            if (club && team) {
                lines.push(`🆚 ${g.opponent}`);
            }
            if (mapsUrl) {
                lines.push(`🗺 ${mapsUrl}`);
            }
            if (dutyLines.length > 0) {
                lines.push("");
                lines.push("📋 VOLUNTEER DUTIES");
                lines.push(...dutyLines);
            }
            // Links section
            const gameUrl = `https://soccerhub.jeremymarks.com.au/#/game/${doc.id}`;
            lines.push("");
            lines.push("🔗 LINKS");
            lines.push(`Match Details: ${gameUrl}`);
            lines.push("Team Hub: https://soccerhub.jeremymarks.com.au");
            lines.push("EMJSC Website: https://emjs.club");
            lines.push("Dribl Team: https://app.dribl.com/app/open?team=NjkzMzkx");
            lines.push("FV Fixtures: https://fv.dribl.com/fixtures/?date_range=default&season=nPmrj2rmow&competition=Rxm8RpZLKr&club=3pmvQzZrdv&timezone=Australia%2FMelbourne");
            const desc = escIcs(lines.join("\n"));
            events.push([
                "BEGIN:VEVENT",
                `UID:${doc.id}@soccerhub.jeremymarks.com.au`,
                `DTSTAMP:${now}`,
                `LAST-MODIFIED:${lastModified}`,
                `SEQUENCE:${calendarVersion}`,
                `DTSTART;TZID=${TZID}:${toLocal(start)}`,
                `DTEND;TZID=${TZID}:${toLocal(end)}`,
                `SUMMARY:${escIcs(`⚽ EMJSC U8 vs ${opponentShort}`)}`,
                `LOCATION:${escIcs(locationFull)}`,
                `URL:${gameUrl}`,
                `DESCRIPTION:${desc}`,
                // Alert fires 60 min before kick-off = 30 min before arrival
                "BEGIN:VALARM",
                "TRIGGER;VALUE=DURATION:-PT60M",
                "ACTION:DISPLAY",
                `DESCRIPTION:⚽ Match reminder — arrive by ${arrivalTime} at ${venueName || locationName || "the venue"}`,
                "END:VALARM",
                "END:VEVENT",
            ].join("\r\n"));
            // Travel event: 30 min block before arrival (60 min before kick-off → arrival time)
            const travelStart = new Date(arrival.getTime() - 30 * 60 * 1000);
            events.push([
                "BEGIN:VEVENT",
                `UID:${doc.id}-travel@soccerhub.jeremymarks.com.au`,
                `DTSTAMP:${now}`,
                `LAST-MODIFIED:${lastModified}`,
                `SEQUENCE:${calendarVersion}`,
                `DTSTART;TZID=${TZID}:${toLocal(travelStart)}`,
                `DTEND;TZID=${TZID}:${toLocal(arrival)}`,
                `SUMMARY:${escIcs(`🚙 Travel to EMJSC Soccer – vs ${opponentShort}`)}`,
                `LOCATION:${escIcs(locationFull)}`,
                `URL:${gameUrl}`,
                `DESCRIPTION:${desc}`,
                "END:VEVENT",
            ].join("\r\n"));
        });
        const ics = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//EMJSC Hub//U8 White Saturday//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            `X-WR-TIMEZONE:${TZID}`,
            "X-WR-CALNAME:EMJSC U8 White Saturday",
            "X-WR-CALDESC:Match fixtures for East Malvern Junior Soccer Club U8 White Saturday",
            "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
            "X-PUBLISHED-TTL:PT6H",
            ...events,
            "END:VCALENDAR",
        ].join("\r\n");
        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-store");
        res.status(200).send(ics);
    }
    catch (err) {
        console.error("fixturesICS error:", err);
        res.status(500).send("Error generating calendar");
    }
});
exports.travelTime = (0, https_1.onRequest)({ region: "australia-southeast1", cors: true, invoker: "public" }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const origin = (req.query.origin || "").trim();
    const destination = (req.query.destination || "").trim();
    const departureParam = req.query.departureTime || "";
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!origin || !destination || !apiKey) {
        res.status(200).json({ minutes: null });
        return;
    }
    // Use actual departure time if it's in the future, otherwise "now"
    const departureSecs = parseInt(departureParam, 10);
    const nowSecs = Math.floor(Date.now() / 1000);
    const departureTime = departureSecs > nowSecs ? departureSecs : nowSecs;
    try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json` +
            `?origins=${encodeURIComponent(origin)}` +
            `&destinations=${encodeURIComponent(destination)}` +
            `&mode=driving` +
            `&departure_time=${departureTime}` +
            `&traffic_model=best_guess` +
            `&key=${apiKey}`;
        const data = await fetch(url).then((r) => r.json());
        const element = (_c = (_b = (_a = data.rows) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.elements) === null || _c === void 0 ? void 0 : _c[0];
        if ((element === null || element === void 0 ? void 0 : element.status) === "OK") {
            const seconds = (_g = (_e = (_d = element.duration_in_traffic) === null || _d === void 0 ? void 0 : _d.value) !== null && _e !== void 0 ? _e : (_f = element.duration) === null || _f === void 0 ? void 0 : _f.value) !== null && _g !== void 0 ? _g : 0;
            res.status(200).json({ minutes: Math.ceil(seconds / 60) });
        }
        else {
            console.warn("Distance Matrix element status:", element === null || element === void 0 ? void 0 : element.status, data);
            res.status(200).json({ minutes: null });
        }
    }
    catch (err) {
        console.error("travelTime error:", err);
        res.status(200).json({ minutes: null });
    }
});
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const CAFE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
function venueCacheKey(venue) {
    return venue.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100);
}
exports.cafesNearby = (0, https_1.onRequest)({ region: "australia-southeast1", cors: true, invoker: "public" }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const venue = (req.query.venue || "").trim();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!venue || !apiKey) {
        res.status(200).json({ cafes: [], cached: false });
        return;
    }
    const bust = req.query.bust === 'true';
    const db = (0, firestore_1.getFirestore)(DATABASE_ID);
    const cacheKey = venueCacheKey(venue);
    const cacheRef = db.collection("cafeCache").doc(cacheKey);
    try {
        // 1. Check Firestore cache (skipped when bust=true)
        if (!bust) {
            const cached = await cacheRef.get();
            if (cached.exists) {
                const data = cached.data();
                const age = Date.now() - ((_c = (_b = (_a = data.fetchedAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : 0);
                if (age < CAFE_CACHE_TTL_MS) {
                    res.status(200).json({ cafes: (_d = data.cafes) !== null && _d !== void 0 ? _d : [], cached: true });
                    return;
                }
            }
        }
        // 2. Geocode venue → lat/lng
        const geoData = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(venue)}&key=${apiKey}`).then((r) => r.json());
        const venueLoc = (_g = (_f = (_e = geoData.results) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.geometry) === null || _g === void 0 ? void 0 : _g.location;
        if (!venueLoc) {
            res.status(200).json({ cafes: [], cached: false });
            return;
        }
        // 3. Places Nearby Search — cafes within 2 km
        const placesData = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
            `?location=${venueLoc.lat},${venueLoc.lng}&radius=2000&type=cafe&key=${apiKey}`).then((r) => r.json());
        const cafes = (placesData.results || [])
            .filter((p) => p.business_status === "OPERATIONAL" && p.rating)
            .map((p) => {
            var _a, _b, _c, _d, _e, _f, _g;
            const cafeLat = (_c = (_b = (_a = p.geometry) === null || _a === void 0 ? void 0 : _a.location) === null || _b === void 0 ? void 0 : _b.lat) !== null && _c !== void 0 ? _c : venueLoc.lat;
            const cafeLng = (_f = (_e = (_d = p.geometry) === null || _d === void 0 ? void 0 : _d.location) === null || _e === void 0 ? void 0 : _e.lng) !== null && _f !== void 0 ? _f : venueLoc.lng;
            return {
                name: p.name,
                address: p.vicinity,
                rating: (_g = p.rating) !== null && _g !== void 0 ? _g : null,
                distanceKm: Math.round(haversineKm(venueLoc.lat, venueLoc.lng, cafeLat, cafeLng) * 10) / 10,
                mapsUrl: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
            };
        });
        // 4. Store in Firestore cache
        await cacheRef.set({ venue, cafes, fetchedAt: new Date() });
        res.status(200).json({ cafes, cached: false });
    }
    catch (err) {
        console.error("cafesNearby error:", err);
        res.status(200).json({ cafes: [], cached: false });
    }
});
// ── Dribl fixture scraper ────────────────────────────────────────────────────
const DRIBL_SCRAPE_URL = "https://fv.dribl.com/fixtures/?date_range=default" +
    "&season=nPmrj2rmow&competition=Rxm8RpZLKr&club=3pmvQzZrdv" +
    "&timezone=Australia%2FMelbourne";
const DRIBL_MONTH_MAP = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
function parseDriblDate(text) {
    if (!text)
        return null;
    const m = text.trim().match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/i);
    if (!m)
        return null;
    const day = String(m[1]).padStart(2, "0");
    const month = DRIBL_MONTH_MAP[m[2].toLowerCase()];
    if (!month)
        return null;
    return `${m[3]}-${String(month).padStart(2, "0")}-${day}`;
}
function parseDriblTime(text) {
    if (!text)
        return null;
    const m = text.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m)
        return null;
    return `${String(m[1]).padStart(2, "0")}:${m[2]}`;
}
// Runs inside the browser via page.evaluate — must be plain serialisable JS.
function extractDriblCards(seenIds) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    const seen = new Set(seenIds);
    const cards = Array.from(document.querySelectorAll("[id^=\"fixture-\"]"));
    const results = [];
    for (const card of cards) {
        const id = card.id;
        if (seen.has(id))
            continue;
        const nameEls = Array.from(card.querySelectorAll("span.text-level-1.tw-font-medium"));
        const logoImgs = Array.from(card.querySelectorAll("img[class*=\"tw-w\"]"));
        const mapAnchors = Array.from(card.querySelectorAll("a[href*=\"maps.google\"]"));
        const venueAnchor = mapAnchors.find((a) => { var _a; return (_a = a.textContent) === null || _a === void 0 ? void 0 : _a.trim(); });
        const roundMatch = (_a = card.textContent) === null || _a === void 0 ? void 0 : _a.match(/Round\s*(\d+)/i);
        results.push({
            id,
            homeTeam: (_d = (_c = (_b = nameEls[0]) === null || _b === void 0 ? void 0 : _b.textContent) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : null,
            awayTeam: (_g = (_f = (_e = nameEls[1]) === null || _e === void 0 ? void 0 : _e.textContent) === null || _f === void 0 ? void 0 : _f.trim()) !== null && _g !== void 0 ? _g : null,
            homeLogo: (_j = (_h = logoImgs[0]) === null || _h === void 0 ? void 0 : _h.src) !== null && _j !== void 0 ? _j : null,
            awayLogo: (_l = (_k = logoImgs[1]) === null || _k === void 0 ? void 0 : _k.src) !== null && _l !== void 0 ? _l : null,
            dateText: (_p = (_o = (_m = card.querySelector("span.tw-font-normal")) === null || _m === void 0 ? void 0 : _m.textContent) === null || _o === void 0 ? void 0 : _o.trim()) !== null && _p !== void 0 ? _p : null,
            timeText: (_s = (_r = (_q = card.querySelector(".text-level-3.pt-2")) === null || _q === void 0 ? void 0 : _q.textContent) === null || _r === void 0 ? void 0 : _r.trim()) !== null && _s !== void 0 ? _s : null,
            mapUrl: (_u = (_t = mapAnchors[0]) === null || _t === void 0 ? void 0 : _t.href) !== null && _u !== void 0 ? _u : null,
            venue: (_w = (_v = venueAnchor === null || venueAnchor === void 0 ? void 0 : venueAnchor.textContent) === null || _v === void 0 ? void 0 : _v.trim()) !== null && _w !== void 0 ? _w : null,
            round: roundMatch ? roundMatch[1] : null,
        });
    }
    return results;
}
exports.scrapeDribl = (0, https_1.onRequest)({
    region: "australia-southeast1",
    cors: true,
    invoker: "public",
    timeoutSeconds: 120,
    memory: "2GiB",
}, async (_req, res) => {
    let browser;
    try {
        const executablePath = await chromium_1.default.executablePath();
        browser = await playwright_extra_1.chromium.launch({
            args: chromium_1.default.args,
            executablePath,
            headless: true,
        });
        const page = await browser.newPage();
        const debug = { url: DRIBL_SCRAPE_URL, totalCards: 0, pages: 1, error: null };
        await page.goto(DRIBL_SCRAPE_URL, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(3000);
        // Detect Cloudflare block early and fail fast with a clear message
        const pageTitle = await page.title();
        if (pageTitle.toLowerCase().includes("cloudflare") || pageTitle.toLowerCase().includes("attention required")) {
            throw new Error("Cloudflare is blocking this request from Google Cloud servers. Run the sync from a local machine instead.");
        }
        // Dismiss cookie banner if present
        try {
            await page.click("button.Cookie__button", { timeout: 2000 });
        }
        catch ( /* none */_a) { /* none */ }
        // Harvest cards incrementally — virtual scroll removes off-screen nodes
        const seenIds = [];
        const raw = [];
        const harvest = async () => {
            const batch = await page.evaluate(extractDriblCards, seenIds);
            for (const card of batch)
                seenIds.push(card.id);
            raw.push(...batch);
        };
        await harvest();
        // Paginate through "Load more..." until exhausted
        try {
            while (true) {
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(800);
                const hasMore = await page.evaluate(() => Array.from(document.querySelectorAll("div.d-flex.flex-column.justify-center"))
                    .some((d) => { var _a; return (_a = d.textContent) === null || _a === void 0 ? void 0 : _a.includes("Load more..."); }));
                if (!hasMore)
                    break;
                const countBefore = await page.evaluate(() => document.querySelectorAll("[id^=\"fixture-\"]").length);
                await page.evaluate(() => {
                    const el = Array.from(document.querySelectorAll("div.d-flex.flex-column.justify-center"))
                        .find((d) => { var _a; return (_a = d.textContent) === null || _a === void 0 ? void 0 : _a.includes("Load more..."); });
                    if (el)
                        el.click();
                });
                try {
                    await page.waitForFunction((n) => document.querySelectorAll("[id^=\"fixture-\"]").length > n, countBefore, { timeout: 8000 });
                }
                catch (_b) {
                    break;
                }
                await harvest();
                debug.pages++;
            }
        }
        catch (loopErr) {
            debug.error = `Load-more loop: ${loopErr instanceof Error ? loopErr.message : String(loopErr)}`;
        }
        // Final harvest for any remaining visible cards
        await harvest();
        debug.totalCards = raw.length;
        const fixtures = raw.map((r) => ({
            round: r.round,
            date: parseDriblDate(r.dateText),
            time: parseDriblTime(r.timeText),
            home_team_name: r.homeTeam,
            away_team_name: r.awayTeam,
            home_team_logo: r.homeLogo,
            away_team_logo: r.awayLogo,
            venue: r.venue,
            map_url: r.mapUrl,
        }));
        res.status(200).json({ fixtures, debug });
    }
    catch (err) {
        console.error("scrapeDribl error:", err);
        res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error", fixtures: [] });
    }
    finally {
        if (browser)
            await browser.close();
    }
});
//# sourceMappingURL=index.js.map