"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixturesICS = void 0;
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
const DEFAULT_DUTIES = [
    { id: "goalie", label: "Goalie (1st Half)", emoji: "", applicableTo: "both" },
    { id: "goalie_2", label: "Goalie (2nd Half)", emoji: "", applicableTo: "both" },
    { id: "snack_provider", label: "Match Day Snacks", emoji: "", applicableTo: "both" },
    { id: "referee", label: "Referee", emoji: "", applicableTo: "home" },
    { id: "pitch_marshal", label: "Pitch Marshall", emoji: "", applicableTo: "home" },
];
exports.fixturesICS = (0, https_1.onRequest)({ region: "australia-southeast1", cors: true }, async (req, res) => {
    try {
        const db = (0, firestore_1.getFirestore)(DATABASE_ID);
        const [gamesSnap, dutiesSnap] = await Promise.all([
            db.collection("games").orderBy("date", "asc").get(),
            db.collection("dutiesConfig").get(),
        ]);
        // Always use document ID as authoritative id (id in data may differ)
        const duties = dutiesSnap.empty
            ? DEFAULT_DUTIES
            : dutiesSnap.docs.map((d) => (Object.assign(Object.assign({}, d.data()), { id: d.id })));
        const now = toUtcStamp(new Date());
        const events = [];
        gamesSnap.forEach((doc) => {
            const g = doc.data();
            if (!g.date)
                return;
            const start = new Date(g.date);
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            const arrivalTime = new Date(start.getTime() - 30 * 60 * 1000)
                .toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
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
            const locationFull = locationName
                ? `${locationName}, Melbourne VIC, Australia`
                : "";
            // Google Maps search link for the description
            const mapsUrl = g.mapUrlOverride ||
                (locationName
                    ? `https://maps.apple.com/?q=${encodeURIComponent(locationName + " Melbourne VIC")}`
                    : null);
            // Build description with real newlines — escIcs converts them to \n
            const lines = [
                `${g.isHome ? "🏠 Home Match" : "✈️ Away Match"}`,
                `📍 ${locationName || "TBC"}`,
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
            if (g.matchWrap) {
                lines.push("");
                lines.push("👨‍💼 COACH NOTES");
                lines.push(g.matchWrap);
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
                `DTSTART;TZID=${TZID}:${toLocal(start)}`,
                `DTEND;TZID=${TZID}:${toLocal(end)}`,
                `SUMMARY:${escIcs(`⚽ EMJSC U8 vs ${opponentShort}`)}`,
                `LOCATION:${escIcs(locationFull)}`,
                `URL:${gameUrl}`,
                `DESCRIPTION:${desc}`,
                // Alert fires 60 min before kick-off = 30 min before arrival
                "BEGIN:VALARM",
                "TRIGGER:-PT60M",
                "ACTION:DISPLAY",
                `DESCRIPTION:⚽ Match reminder — arrive by ${arrivalTime} at ${locationName || "the venue"}`,
                "END:VALARM",
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
//# sourceMappingURL=index.js.map