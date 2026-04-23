import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
