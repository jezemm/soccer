"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nearbyPlaces = exports.fixturesICS = void 0;
// Must be first — forces Date local methods to use Melbourne time
process.env.TZ = "Australia/Melbourne";
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
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
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.status(200).send(ics);
    }
    catch (err) {
        console.error("fixturesICS error:", err);
        res.status(500).send("Error generating calendar");
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
exports.nearbyPlaces = (0, https_1.onCall)({ region: "australia-southeast1" }, async (request) => {
    var _a, _b, _c, _d;
    const venue = (((_a = request.data) === null || _a === void 0 ? void 0 : _a.venue) || "").trim();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!venue || !apiKey)
        return { cafes: [] };
    try {
        // 1. Geocode venue → lat/lng
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json` +
            `?address=${encodeURIComponent(venue)}&key=${apiKey}`;
        const geoData = await fetch(geoUrl).then((r) => r.json());
        const venueLoc = (_d = (_c = (_b = geoData.results) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.geometry) === null || _d === void 0 ? void 0 : _d.location;
        if (!venueLoc)
            return { cafes: [] };
        // 2. Places Nearby Search — cafes within 2 km
        const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
            `?location=${venueLoc.lat},${venueLoc.lng}&radius=2000&type=cafe&key=${apiKey}`;
        const placesData = await fetch(placesUrl).then((r) => r.json());
        const cafes = (placesData.results || [])
            .filter((p) => p.business_status === "OPERATIONAL" && p.rating)
            .map((p) => {
            var _a, _b, _c, _d, _e, _f, _g;
            const cafeLat = (_c = (_b = (_a = p.geometry) === null || _a === void 0 ? void 0 : _a.location) === null || _b === void 0 ? void 0 : _b.lat) !== null && _c !== void 0 ? _c : venueLoc.lat;
            const cafeLng = (_f = (_e = (_d = p.geometry) === null || _d === void 0 ? void 0 : _d.location) === null || _e === void 0 ? void 0 : _e.lng) !== null && _f !== void 0 ? _f : venueLoc.lng;
            const distanceKm = Math.round(haversineKm(venueLoc.lat, venueLoc.lng, cafeLat, cafeLng) * 10) / 10;
            return {
                name: p.name,
                address: p.vicinity,
                rating: (_g = p.rating) !== null && _g !== void 0 ? _g : null,
                distanceKm,
                mapsUrl: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
            };
        });
        return { cafes };
    }
    catch (err) {
        console.error("nearbyPlaces error:", err);
        return { cafes: [] };
    }
});
//# sourceMappingURL=index.js.map