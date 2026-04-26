// Must be first — forces Date local methods to use Melbourne time
process.env.TZ = "Australia/Melbourne";

import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

const DATABASE_ID = "ai-studio-d1fcc763-4ce4-4bde-b121-8a73822ddcd3";
const TZID = "Australia/Melbourne";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocal(d: Date): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function toUtcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

// Escape ICS special chars; real newlines become \n (interpreted by calendar apps)
function escIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function splitOpponent(opponent: string) {
  const idx = opponent.indexOf(" - ");
  if (idx === -1) return { club: "", team: opponent };
  return { club: opponent.slice(0, idx), team: opponent.slice(idx + 3) };
}

function getVenueName(location: string): string {
  const m = location.match(/^(.*\b(?:Reserve|Park|Ground|Oval|Centre|Center|Stadium))\b/i);
  if (m) return m[1].trim();
  return location.replace(/\s+(?:Pitch|Field|Midi|Half|Court|\d).*$/i, "").trim() || location;
}

function formatVenueDisplay(location: string): string {
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

export const fixturesICS = onRequest(
  { region: "australia-southeast1", cors: true },
  async (req, res) => {
    try {
      const db = getFirestore(DATABASE_ID);

      const [gamesSnap, dutiesSnap, calendarSnap] = await Promise.all([
        db.collection("games").orderBy("date", "asc").get(),
        db.collection("dutiesConfig").get(),
        db.collection("settings").doc("calendar").get(),
      ]);

      // Always use document ID as authoritative id (id in data may differ)
      const duties: any[] =
        dutiesSnap.empty
          ? DEFAULT_DUTIES
          : dutiesSnap.docs.map((d) => ({ ...d.data(), id: d.id }));

      const calendarData = calendarSnap.exists ? calendarSnap.data() : null;
      const calendarVersion: number = calendarData?.version ?? 0;
      const calendarUpdatedAt: Date = calendarData?.updatedAt?.toDate?.() ?? new Date();

      const now = toUtcStamp(new Date());
      const lastModified = toUtcStamp(calendarUpdatedAt);
      const events: string[] = [];

      gamesSnap.forEach((doc) => {
        const g = doc.data();
        if (!g.date) return;

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
        const applicableDuties = duties.filter((d: any) => {
          const at = d.applicableTo;
          if (!at || at === "both") return true;
          if (at === "home" && g.isHome) return true;
          if (at === "away" && !g.isHome) return true;
          return false;
        });

        const dutyLines = applicableDuties.map((d: any) => {
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
        const lines: string[] = [
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

        events.push(
          [
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
          ].join("\r\n")
        );

        // Travel event: 30 min block before arrival (60 min before kick-off → arrival time)
        const travelStart = new Date(arrival.getTime() - 30 * 60 * 1000);
        events.push(
          [
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
          ].join("\r\n")
        );
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
    } catch (err) {
      console.error("fixturesICS error:", err);
      res.status(500).send("Error generating calendar");
    }
  }
);

export const travelTime = onRequest(
  { region: "australia-southeast1", cors: true, invoker: "public" },
  async (req, res) => {
    const origin = ((req.query.origin as string) || "").trim();
    const destination = ((req.query.destination as string) || "").trim();
    const departureParam = (req.query.departureTime as string) || "";
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
      const url =
        `https://maps.googleapis.com/maps/api/distancematrix/json` +
        `?origins=${encodeURIComponent(origin)}` +
        `&destinations=${encodeURIComponent(destination)}` +
        `&mode=driving` +
        `&departure_time=${departureTime}` +
        `&traffic_model=best_guess` +
        `&key=${apiKey}`;

      const data = await fetch(url).then((r) => r.json());
      const element = data.rows?.[0]?.elements?.[0];

      if (element?.status === "OK") {
        const seconds = element.duration_in_traffic?.value ?? element.duration?.value ?? 0;
        res.status(200).json({ minutes: Math.ceil(seconds / 60) });
      } else {
        console.warn("Distance Matrix element status:", element?.status, data);
        res.status(200).json({ minutes: null });
      }
    } catch (err) {
      console.error("travelTime error:", err);
      res.status(200).json({ minutes: null });
    }
  }
);

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CAFE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function venueCacheKey(venue: string): string {
  return venue.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100);
}

export const cafesNearby = onRequest(
  { region: "australia-southeast1", cors: true, invoker: "public" },
  async (req, res) => {
    const venue = ((req.query.venue as string) || "").trim();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!venue || !apiKey) {
      res.status(200).json({ cafes: [], cached: false });
      return;
    }

    const bust = req.query.bust === 'true';
    const db = getFirestore(DATABASE_ID);
    const cacheKey = venueCacheKey(venue);
    const cacheRef = db.collection("cafeCache").doc(cacheKey);

    try {
      // 1. Check Firestore cache (skipped when bust=true)
      if (!bust) {
        const cached = await cacheRef.get();
        if (cached.exists) {
          const data = cached.data()!;
          const age = Date.now() - (data.fetchedAt?.toMillis?.() ?? 0);
          if (age < CAFE_CACHE_TTL_MS) {
            res.status(200).json({ cafes: data.cafes ?? [], cached: true });
            return;
          }
        }
      }

      // 2. Geocode venue → lat/lng
      const geoData = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(venue)}&key=${apiKey}`
      ).then((r) => r.json());
      const venueLoc: { lat: number; lng: number } | undefined =
        geoData.results?.[0]?.geometry?.location;
      if (!venueLoc) {
        res.status(200).json({ cafes: [], cached: false });
        return;
      }

      // 3. Places Nearby Search — cafes within 2 km
      const placesData = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${venueLoc.lat},${venueLoc.lng}&radius=2000&type=cafe&key=${apiKey}`
      ).then((r) => r.json());

      const cafes = ((placesData.results as any[]) || [])
        .filter((p) => p.business_status === "OPERATIONAL" && p.rating)
        .map((p) => {
          const cafeLat: number = p.geometry?.location?.lat ?? venueLoc.lat;
          const cafeLng: number = p.geometry?.location?.lng ?? venueLoc.lng;
          return {
            name: p.name as string,
            address: p.vicinity as string,
            rating: (p.rating as number) ?? null,
            distanceKm: Math.round(haversineKm(venueLoc.lat, venueLoc.lng, cafeLat, cafeLng) * 10) / 10,
            mapsUrl: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
          };
        });

      // 4. Store in Firestore cache
      await cacheRef.set({ venue, cafes, fetchedAt: new Date() });

      res.status(200).json({ cafes, cached: false });
    } catch (err) {
      console.error("cafesNearby error:", err);
      res.status(200).json({ cafes: [], cached: false });
    }
  }
);

// ── Dribl fixture sync (multi-week API loop) ─────────────────────────────────
//
// fv.dribl.com is protected by Cloudflare and blocks GCP datacenter IPs even
// with a stealth browser. The mc-api.dribl.com mobile API works from Cloud
// Functions. date_range=default returns the current week only, so we iterate
// weekly across the full FV junior season (April–October) and deduplicate.

const DRIBL_API_BASE = "https://mc-api.dribl.com/api/fixtures";
const DRIBL_TENANT = "w8zdBWPmBX";
const DRIBL_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Dribl/1.0 (iPhone; iOS 17.0; Scale/3.00)",
  "X-Tenant": DRIBL_TENANT,
};

// Returns YYYY-MM-DD for a Date in Melbourne local time.
function toMelbourneDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
}

// Returns HH:MM for a Date in Melbourne local time.
function toMelbourneTime(d: Date): string {
  return d.toLocaleTimeString("en-AU", {
    timeZone: "Australia/Melbourne",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

async function fetchWeek(isoDate: string): Promise<any[]> {
  const url =
    `${DRIBL_API_BASE}?date_range=${isoDate}` +
    `&season=nPmrj2rmow&club=3pmvQzZrdv&tenant=${DRIBL_TENANT}&timezone=Australia%2FMelbourne`;
  const resp = await fetch(url, { headers: DRIBL_HEADERS });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.data || data.fixtures || (Array.isArray(data) ? data : []);
}

function normaliseFixture(f: any): any {
  const flat = f.attributes ? { ...f.attributes, id: f.id } : { ...f };
  // Convert UTC ISO date to Melbourne local date + time
  if (flat.date && flat.date.includes("T")) {
    const d = new Date(flat.date);
    flat.date = toMelbourneDate(d);
    if (!flat.time) flat.time = toMelbourneTime(d);
  }
  // Normalise logo field names
  if (!flat.home_team_logo && flat.home_logo) flat.home_team_logo = flat.home_logo;
  if (!flat.away_team_logo && flat.away_logo) flat.away_team_logo = flat.away_logo;
  return flat;
}

export const scrapeDribl = onRequest(
  { region: "australia-southeast1", cors: true, invoker: "public", timeoutSeconds: 120 },
  async (_req, res) => {
    try {
      // Iterate every Saturday from season start to end (FV MiniRoos: Apr–Sep).
      // Each call with a specific YYYY-MM-DD returns fixtures for that week.
      const seasonStart = new Date("2026-04-01");
      const seasonEnd = new Date("2026-10-01");
      const seenIds = new Set<string>();
      const allFixtures: any[] = [];
      const weeksFetched: string[] = [];
      const weekErrors: string[] = [];

      for (let d = new Date(seasonStart); d < seasonEnd; d.setDate(d.getDate() + 7)) {
        const iso = d.toISOString().split("T")[0];
        try {
          const raw = await fetchWeek(iso);
          let added = 0;
          for (const f of raw) {
            const id = f.id || f.match_hash_id || JSON.stringify(f).slice(0, 60);
            if (seenIds.has(id)) continue;
            seenIds.add(id);
            allFixtures.push(normaliseFixture(f));
            added++;
          }
          if (added > 0) weeksFetched.push(`${iso}(+${added})`);
        } catch (e: any) {
          weekErrors.push(`${iso}: ${e.message}`);
        }
      }

      res.status(200).json({
        fixtures: allFixtures,
        debug: { source: "dribl-api-multiweek", count: allFixtures.length, weeksFetched, weekErrors },
      });
    } catch (err: any) {
      console.error("scrapeDribl error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch from Dribl" });
    }
  }
);
