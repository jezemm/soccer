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
// Format as Melbourne local time for use with TZID property
function toLocal(d) {
    return (`${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
        `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`);
}
// UTC timestamp for DTSTAMP (must always be UTC per RFC 5545)
function toUtcStamp(d) {
    return (`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
        `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`);
}
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
exports.fixturesICS = (0, https_1.onRequest)({ region: "australia-southeast1", cors: true }, async (req, res) => {
    try {
        const db = (0, firestore_1.getFirestore)(DATABASE_ID);
        const snap = await db
            .collection("games")
            .orderBy("date", "asc")
            .get();
        const now = toUtcStamp(new Date());
        const events = [];
        snap.forEach((doc) => {
            const g = doc.data();
            if (!g.date)
                return;
            const start = new Date(g.date);
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            const arrival = new Date(start.getTime() - 30 * 60 * 1000)
                .toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
            const { club, team } = splitOpponent(g.opponent || "");
            const opponentShort = club || team || g.opponent || "TBC";
            const summary = escIcs(`EMJSC U8 vs ${opponentShort}`);
            const desc = escIcs([
                g.isHome ? "Home match" : "Away match",
                `Arrive by ${arrival}`,
                club && team ? `vs ${g.opponent}` : "",
            ]
                .filter(Boolean)
                .join("\\n"));
            events.push([
                "BEGIN:VEVENT",
                `UID:${doc.id}@soccerhub.jeremymarks.com.au`,
                `DTSTAMP:${now}`,
                `DTSTART;TZID=${TZID}:${toLocal(start)}`,
                `DTEND;TZID=${TZID}:${toLocal(end)}`,
                `SUMMARY:${summary}`,
                `LOCATION:${escIcs(g.location || "")}`,
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
//# sourceMappingURL=index.js.map