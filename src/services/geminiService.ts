import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function parseFixtureText(text: string) {
  const prompt = `
    Extract soccer game details from the following text. 
    Look for:
    - Date and Time
    - Opponent team name
    - Location (Ground name)
    
    If the location is "Central Park, Malvern" or similar, mark isHome as true.
    Return a JSON array of objects with keys: date (ISO string), opponent, location, isHome (boolean).
    
    Text:
    ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "ISO 8601 date string" },
              opponent: { type: Type.STRING },
              location: { type: Type.STRING },
              isHome: { type: Type.BOOLEAN }
            },
            required: ["date", "opponent", "location", "isHome"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error parsing fixture:", error);
    return [];
  }
}

export async function getTravelTimeEstimate(origin: string, destination: string, arrivalTime: string) {
  const prompt = `
    What is the typical travel time by car from "${origin}" to "${destination}" in Melbourne, arriving at ${arrivalTime} on a typical Saturday?
    Please provide the travel time in minutes as a single number.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    // Extracting the first number found in the response text
    const match = response.text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  } catch (error) {
    console.error("Error fetching travel time:", error);
    return null;
  }
}
