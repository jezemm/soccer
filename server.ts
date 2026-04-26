import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── In-memory cache for Playwright-scraped data ──────────────────────────────
// Persists for the lifetime of the server process; use ?refresh=true to bust.
interface CacheEntry { data: any; cachedAt: string }
const scraperCache = {
  competitions: null as CacheEntry | null,
  clubs: new Map<string, CacheEntry>(),
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Travel Time
  app.post("/api/travel-time", async (req, res) => {
    const { origin, destination, arrivalTime } = req.body;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Google Maps API Key not configured on server" });
    }

    if (!origin || !destination) {
      return res.status(400).json({ error: "Missing origin or destination" });
    }

    try {
      // arrivalTime should be an ISO string, we convert to epoch seconds
      const arrivalEpoch = Math.floor(new Date(arrivalTime).getTime() / 1000);

      const response = await axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
        params: {
          origins: origin,
          destinations: destination,
          arrival_time: arrivalEpoch,
          mode: 'driving',
          key: apiKey
        }
      });

      if (response.data.status !== "OK") {
        return res.status(500).json({ error: response.data.error_message || "Maps API Error" });
      }

      const element = response.data.rows[0].elements[0];
      if (element.status !== "OK") {
        return res.status(404).json({ error: "Route not found or address invalid" });
      }

      // Convert duration in seconds to minutes
      const durationMinutes = Math.ceil(element.duration.value / 60);
      
      res.json({ travelTimeMinutes: durationMinutes, rawDurationSeconds: element.duration.value });
    } catch (error: any) {
      console.error("Travel Time Error:", error.message);
      res.status(500).json({ error: "Failed to fetch from Google Maps" });
    }
  });

  // Playwright scraper — competitions for the FV tenant
  // ?refresh=true bypasses the in-process cache and re-scrapes fv.dribl.com
  app.get('/api/dribl/competitions', (req, res) => {
    const refresh = req.query.refresh === 'true';
    if (!refresh && scraperCache.competitions) {
      console.log('[competitions] serving from cache');
      return res.json({ ...scraperCache.competitions.data, cachedAt: scraperCache.competitions.cachedAt });
    }
    const scriptPath = path.join(__dirname, 'scripts', 'scrape-dribl.mjs');
    console.log('[competitions] spawning Playwright scraper');
    execFile('node', [scriptPath, '--competitions', '--json'], {
      timeout: 120_000,
      maxBuffer: 5 * 1024 * 1024,
    }, (err, stdout, stderr) => {
      if (stderr) console.error('[competitions stderr]', stderr.substring(0, 500));
      if (err) {
        console.error('[competitions] child error:', err.message);
        return res.status(500).json({ error: err.message || 'Scrape failed' });
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        const cachedAt = new Date().toISOString();
        scraperCache.competitions = { data: parsed, cachedAt };
        res.json({ ...parsed, cachedAt });
      } catch {
        console.error('[competitions] parse error. stdout:', stdout.substring(0, 200));
        res.status(500).json({ error: 'Failed to parse scraper output' });
      }
    });
  });

  // Playwright scraper — clubs for a competition
  // ?refresh=true bypasses the in-process cache and re-scrapes fv.dribl.com
  app.get('/api/dribl/clubs', (req, res) => {
    const { season = '', competition = '', refresh } = req.query as Record<string, string>;
    const cacheKey = `${season}:${competition}`;
    if (refresh !== 'true' && scraperCache.clubs.has(cacheKey)) {
      const entry = scraperCache.clubs.get(cacheKey)!;
      console.log('[clubs] serving from cache', cacheKey);
      return res.json({ ...entry.data, cachedAt: entry.cachedAt });
    }
    const scriptPath = path.join(__dirname, 'scripts', 'scrape-dribl.mjs');
    const args = ['--clubs', '--json'];
    if (season) args.push('--season', season);
    if (competition) args.push('--competition', competition);
    console.log('[clubs] spawning Playwright scraper', { season, competition });
    execFile('node', [scriptPath, ...args], {
      timeout: 120_000,
      maxBuffer: 5 * 1024 * 1024,
    }, (err, stdout, stderr) => {
      if (stderr) console.error('[clubs stderr]', stderr.substring(0, 500));
      if (err) {
        console.error('[clubs] child error:', err.message);
        return res.status(500).json({ error: err.message || 'Scrape failed' });
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        const cachedAt = new Date().toISOString();
        scraperCache.clubs.set(cacheKey, { data: parsed, cachedAt });
        res.json({ ...parsed, cachedAt });
      } catch {
        console.error('[clubs] parse error. stdout:', stdout.substring(0, 200));
        res.status(500).json({ error: 'Failed to parse scraper output' });
      }
    });
  });

  // Playwright scraper for Dribl fixture page (logos + map links).
  // Spawns a child Node process to avoid ESM/tsx dynamic-import issues.
  app.get("/api/scrape-dribl", (req, res) => {
    const scriptPath = path.join(__dirname, 'scripts', 'scrape-dribl.mjs');
    const url = (req.query.url as string) || '';
    const args = ['--json'];
    if (url) args.push('--url', url);
    console.log('[scrape-dribl] spawning:', scriptPath, url ? `url=${url}` : '(default url)');

    execFile('node', [scriptPath, ...args], {
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    }, (err, stdout, stderr) => {
      if (stderr) console.error('[scrape-dribl stderr]', stderr.substring(0, 500));
      if (err) {
        console.error('[scrape-dribl] child error:', err.message);
        return res.status(500).json({ error: err.message || 'Scrape failed' });
      }
      try {
        res.json(JSON.parse(stdout.trim()));
      } catch (parseErr: any) {
        console.error('[scrape-dribl] parse error. stdout:', stdout.substring(0, 200));
        res.status(500).json({ error: 'Failed to parse scraper output' });
      }
    });
  });

  // Proxy for Dribl Fixtures API
  app.get("/api/sync-fixtures", async (req, res) => {
    try {
      const { season, club, tenant } = req.query;
      const tenantId = (tenant as string) || 'w8zdBWPmBX';
      
      const response = await axios.get("https://mc-api.dribl.com/api/fixtures", {
        params: {
          date_range: 'default',
          season: season || 'nPmrj2rmow',
          club: club || '3pmvQzZrdv',
          tenant: tenantId,
          timezone: 'Australia/Sydney'
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Dribl/1.0 (iPhone; iOS 17.0; Scale/3.00)',
          'X-Tenant': tenantId
        }
      });
      
      res.json(response.data);
    } catch (error: any) {
      console.error("Dribl Sync Error:", error.message);
      res.status(500).json({ error: "Failed to fetch fixtures from Dribl" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
