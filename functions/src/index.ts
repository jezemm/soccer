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
  const m = location.match(/^(.*?\b(?:Reserve|Park|Ground|Oval|Centre|Center|Stadium))\b/i);
  if (m) return m[1].trim();
  return location.replace(/\s+(?:Pitch|Field|Midi|Half|Court|\d).*$/i, "").trim() || location;
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

      const [gamesSnap, dutiesSnap] = await Promise.all([
        db.collection("games").orderBy("date", "asc").get(),
        db.collection("dutiesConfig").get(),
      ]);

      // Always use document ID as authoritative id (id in data may differ)
      const duties: any[] =
        dutiesSnap.empty
          ? DEFAULT_DUTIES
          : dutiesSnap.docs.map((d) => ({ ...d.data(), id: d.id }));

      const now = toUtcStamp(new Date());
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
            ? `https://maps.apple.com/?q=${encodeURIComponent(venueName + " Melbourne VIC")}`
            : null);

        // Build description with real newlines — escIcs converts them to \n
        const lines: string[] = [
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

        events.push(
          [
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
            "TRIGGER;VALUE=DURATION:-PT60M",
            "ACTION:DISPLAY",
            `DESCRIPTION:⚽ Match reminder — arrive by ${arrivalTime} at ${venueName || locationName || "the venue"}`,
            "END:VALARM",
            "END:VEVENT",
          ].join("\r\n")
        );

        // Travel event: 30 min block before kick-off (arrival time → kick-off)
        events.push(
          [
            "BEGIN:VEVENT",
            `UID:${doc.id}-travel@soccerhub.jeremymarks.com.au`,
            `DTSTAMP:${now}`,
            `DTSTART;TZID=${TZID}:${toLocal(arrival)}`,
            `DTEND;TZID=${TZID}:${toLocal(start)}`,
            `SUMMARY:${escIcs(`🚙 Travel to EMJSC Soccer – vs ${opponentShort}`)}`,
            `LOCATION:${escIcs(locationFull)}`,
            `URL:${gameUrl}`,
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
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).send(ics);
    } catch (err) {
      console.error("fixturesICS error:", err);
      res.status(500).send("Error generating calendar");
    }
  }
);
