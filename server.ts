import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || "3000");
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

interface Scenario {
  template_id: string;
  difficulty: "easy" | "medium" | "hard";
  type: string;
  category: string;
  sender: string;
  subject: string;
  body: string;
  red_flags: string[];
  ioc_categories: string[];
  explanation: string;
}

// Room Manager
export interface RoomConfig {
  timerEnabled: boolean;
  roundDuration: number;
  maxPlayers: number;
  questionCount: number;
  analysisEnabled: boolean;
}

interface Player {
  id: string;
  callsign: string;
  score: number;
  ws: WebSocket;
  isSpectator?: boolean;
}

interface Room {
  id: string;
  players: Map<string, Player>;
  scenarios: Scenario[];
  currentScenarioIndex: number;
  state: "lobby" | "playing" | "results";
  hostId: string;
  config: RoomConfig;
  scenarioEndTime: number | null;
}

const rooms = new Map<string, Room>();

const STANDARD_IOCS = [
  "Suspicious Sender Address",
  "Suspicious Links/URLs",
  "Sense of Urgency/Fear",
  "Request for Sensitive Info",
  "Spelling/Grammar Errors",
  "Unexpected Attachment"
];

function broadcast(room: Room, payload: any) {
  room.players.forEach((player) => {
    try {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(payload));
      }
    } catch (err) {
      console.error(`Failed to send to player ${player.id}:`, err);
    }
  });
}

wss.on("connection", (ws) => {
  let currentPlayerId: string | null = null;
  let currentRoomId: string | null = null;

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { type, payload } = message;

      switch (type) {
        case "JOIN_ROOM": {
          const { roomId, callsign, playerId } = payload;
          currentPlayerId = playerId;
          currentRoomId = roomId;

          if (!rooms.has(roomId)) {
            rooms.set(roomId, {
              id: roomId,
              players: new Map(),
              scenarios: [],
              currentScenarioIndex: 0,
              state: "lobby",
              hostId: playerId,
              config: {
                timerEnabled: true,
                roundDuration: 60,
                maxPlayers: 4,
                questionCount: 3,
                analysisEnabled: true
              },
              scenarioEndTime: null
            });
          }

          const room = rooms.get(roomId)!;
          if (room.players.size >= room.config.maxPlayers && !room.players.has(playerId)) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "Room is full" } }));
            return;
          }

          const isSpectator = room.state === "playing" && !room.players.has(playerId);

          room.players.set(playerId, {
            id: playerId,
            callsign,
            score: 0,
            ws,
            isSpectator
          });

          // Sync room state
          broadcast(room, {
            type: "ROOM_UPDATE",
            payload: {
              players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                callsign: p.callsign,
                score: p.score,
                isSpectator: p.isSpectator
              })),
              state: room.state,
              hostId: room.hostId,
              config: room.config
            }
          });
          break;
        }

        case "UPDATE_CONFIG": {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room || room.hostId !== currentPlayerId || room.state !== "lobby") return;

          room.config = { ...room.config, ...payload };
          broadcast(room, {
            type: "ROOM_UPDATE",
            payload: {
              players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                callsign: p.callsign,
                score: p.score,
                isSpectator: p.isSpectator
              })),
              state: room.state,
              hostId: room.hostId,
              config: room.config
            }
          });
          break;
        }

        case "START_GAME": {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room || room.hostId !== currentPlayerId) return;

          const { scenarios } = payload; // Accepting scenarios from client (Host)
          if (!scenarios || !Array.isArray(scenarios)) {
             console.error("No scenarios provided for START_GAME");
             return;
          }

          room.state = "playing";
          room.scenarios = scenarios;
          room.currentScenarioIndex = 0;
          room.scenarioEndTime = room.config.timerEnabled ? Date.now() + (room.config.roundDuration * 1000) : null;

          // Clear spectator status for all when game starts
          room.players.forEach(p => p.isSpectator = false);

          broadcast(room, {
            type: "GAME_STARTED",
            payload: {
              scenario: room.scenarios[0],
              index: 0,
              total: room.scenarios.length,
              endTime: room.scenarioEndTime
            }
          });
          break;
        }

        case "SUBMIT_ANSWER": {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room || room.state !== "playing") return;

          const { isSafe, checkedIoCs = [], timeout = false } = payload;
          const player = room.players.get(currentPlayerId);
          if (!player) return;

          const currentScenario = room.scenarios[room.currentScenarioIndex];
          const isActualPhishing = currentScenario.type === "phishing" || currentScenario.type === "social_engineering";
          
          let scoreGained = 0;
          let isCorrectBase = false;

          if (!timeout) {
            if (isSafe && !isActualPhishing) {
               isCorrectBase = true;
               scoreGained += 100;
            } else if (!isSafe && isActualPhishing) {
               isCorrectBase = true;
               scoreGained += 50;
               if (room.config.analysisEnabled) {
                 const correctIoCs = new Set(currentScenario.ioc_categories || []);
                 checkedIoCs.forEach((ioc: string) => {
                   if (correctIoCs.has(ioc)) {
                     scoreGained += 25;
                   } else {
                     scoreGained -= 10;
                   }
                 });
               } else {
                 scoreGained += 50;
               }
            }
          }

          player.score += Math.max(0, scoreGained);

          ws.send(JSON.stringify({
            type: "ANSWER_FEEDBACK",
            payload: {
              correct: isCorrectBase,
              explanation: currentScenario.explanation,
              red_flags: currentScenario.red_flags,
              scoreGained: Math.max(0, scoreGained)
            }
          }));

          broadcast(room, {
            type: "SCORE_UPDATE",
            payload: {
              players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                callsign: p.callsign,
                score: p.score
              }))
            }
          });
          break;
        }

        case "NEXT_SCENARIO": {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room || room.state !== "playing") return;
          if (room.hostId !== currentPlayerId) return; // Only host advances

          room.currentScenarioIndex++;
          if (room.currentScenarioIndex >= room.scenarios.length) {
            room.state = "results";
            broadcast(room, {
              type: "GAME_RESULTS",
              payload: {
                players: Array.from(room.players.values())
                  .filter(p => !p.isSpectator)
                  .map(p => ({
                    id: p.id,
                    callsign: p.callsign,
                    score: p.score
                  })).sort((a,b) => b.score - a.score)
              }
            });
          } else {
            room.scenarioEndTime = room.config.timerEnabled ? Date.now() + (room.config.roundDuration * 1000) : null;
            broadcast(room, {
              type: "NEW_SCENARIO",
              payload: {
                scenario: room.scenarios[room.currentScenarioIndex],
                index: room.currentScenarioIndex,
                total: room.scenarios.length,
                endTime: room.scenarioEndTime
              }
            });
          }
          break;
        }

        case "UPDATE_CONFIG": {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room || room.hostId !== currentPlayerId) return;
          
          room.config = { ...room.config, ...payload };
          broadcast(room, {
            type: "ROOM_UPDATE",
            payload: {
              players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                callsign: p.callsign,
                score: p.score,
                isSpectator: p.isSpectator
              })),
              hostId: room.hostId,
              config: room.config
            }
          });
          break;
        }
      }
    } catch (err) {
      console.error("WS Message Error:", err);
    }
  });

  ws.on("close", () => {
    if (currentRoomId && currentPlayerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.players.delete(currentPlayerId);
        if (room.players.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          // If host left, assign new host
          if (room.hostId === currentPlayerId) {
            room.hostId = room.players.keys().next().value || "";
          }
          broadcast(room, {
            type: "ROOM_UPDATE",
            payload: {
              players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                callsign: p.callsign,
                score: p.score,
                isSpectator: p.isSpectator
              })),
              state: room.state,
              hostId: room.hostId,
              config: room.config
            }
          });
        }
      }
    }
  });
});

// Vite Middleware for Dev
async function startServer() {
  // Scenario API
  app.get("/api/scenarios", async (req, res) => {
    const count = parseInt(req.query.count as string) || 3;
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Generate a list of EXACTLY ${count} COMPLETELY UNIQUE cyber-security scenarios for a phishing awareness game.
      CRITICAL: You MUST return EXACTLY ${count} items. 
      STRICT REQUIREMENT: ZERO REPETITION. Every scenario must have a unique company name, unique sender, unique subject, and unique body.
      CONTEXT DIVERSITY: Rotate through: Ecommerce (Target, Walmart), Fintech (PayPal, Venmo, Coinbase), SaaS (Salesforce, Slack), Gov (IRS, Social Security), Utilities (Comcast, PG&E), and internal Corporate (Legal, Marketing, Facilities).
      DIFFICULTY RANGE: Mix of 'easy' (obvious typos), 'medium' (look-alike domains), and 'hard' (targeted BEC or complex social engineering).
      TYPE RANGE: roughly 70% phishing/social engineering, 30% legitimate.
      Return a JSON array of objects.
      Each object keys: template_id, difficulty (easy|medium|hard), type (phishing|social_engineering|legitimate), category, sender, subject, body, red_flags, ioc_categories, explanation.
      ioc_categories must be from: [${STANDARD_IOCS.join(", ")}].
      Random Seed for unique generation: ${Date.now()}_${Math.random()}.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const scenarios = JSON.parse(text || "[]");
      res.json(scenarios);
    } catch (err) {
      console.error("Gemini failed:", err);
      res.status(500).json([]);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Correctly resolve dist path for production
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));
    app.get("*", (req, res) => {
      // Prevent serving index.html for missing assets
      if (req.path.includes(".") || req.path.startsWith("/assets")) {
        res.status(404).send("Asset not found");
        return;
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
