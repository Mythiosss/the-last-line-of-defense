import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Shield, 
  Users, 
  Settings as SettingsIcon, 
  Play, 
  X, 
  Check, 
  AlertTriangle, 
  ChevronRight,
  Trophy,
  Volume2,
  VolumeX,
  Monitor,
  Search,
  Maximize2,
  Minimize2,
  HelpCircle,
  Mail,
  Lock,
  User,
  Clock,
  Terminal,
  FileText,
  Timer,
  Info,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";

// --- AI Setup ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const isAiAvailable = GEMINI_API_KEY.length > 20;
const ai = isAiAvailable ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// --- Types ---
type View = "MAIN_MENU" | "LOBBY" | "GAME" | "RESULTS" | "SETTINGS";

interface Player {
  id: string;
  callsign: string;
  score: number;
}

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

interface Feedback {
  correct: boolean;
  explanation: string;
  red_flags: string[];
  scoreGained?: number;
}

const STANDARD_IOCS = [
  "Suspicious Sender Address",
  "Suspicious Links/URLs",
  "Sense of Urgency/Fear",
  "Request for Sensitive Info",
  "Spelling/Grammar Errors",
  "Unexpected Attachment"
];

const BASE_SCENARIOS: Scenario[] = [
  {
    template_id: "static_1",
    difficulty: "easy",
    type: "phishing",
    category: "Urgent Security Alert",
    sender: "security-alert@company-verify.com",
    subject: "Suspicious Login Attempt Detected",
    body: "We detected a login attempt from a new device in Moscow, Russia. If this wasn't you, please click the link below immediately to secure your account: http://company-verify.com/secure-account-reset",
    red_flags: [
      "Mismatched domain (company-verify.com instead of company.com)",
      "Sense of urgency/fear",
      "Suspicious link"
    ],
    ioc_categories: ["Suspicious Sender Address", "Sense of Urgency/Fear", "Suspicious Links/URLs"],
    explanation: "This is a classic phishing attempt using fear and a look-alike domain to steal credentials."
  },
  {
    template_id: "static_2",
    difficulty: "medium",
    type: "legitimate",
    category: "HR Update",
    sender: "hr@company.com",
    subject: "May Enrollment Period",
    body: "The annual health benefits enrollment period begins next Monday. Please review the updated policy documents on the internal portal under the 'Benefits' tab. No immediate action required unless you wish to change your plan.",
    red_flags: [],
    ioc_categories: [],
    explanation: "This is a legitimate internal email. It comes from the correct domain and directs users to a known internal portal without suspicious links."
  },
  {
    template_id: "static_3",
    difficulty: "hard",
    type: "social_engineering",
    category: "CEO Direct Request",
    sender: "ceo.office@comp-group.org",
    subject: "Urgent Wire Transfer",
    body: "I am in a meeting with a high-profile client and need a wire transfer of $15,000 processed immediately to the attached account details. Mark it as 'Project Phoenix' to bypass standard verification. Keep this confidential.",
    red_flags: [
      "Suspicious sender domain (.org instead of .com)",
      "Request to bypass internal controls",
      "Confidentiality pressure"
    ],
    ioc_categories: ["Suspicious Sender Address", "Sense of Urgency/Fear", "Request for Sensitive Info"],
    explanation: "This is a business email compromise (BEC) attack targeting financial staff by impersonating executives."
  }
];

async function generateScenarios(count = 5): Promise<Scenario[]> {
  if (!ai) {
    console.warn("AI service not available (API key too short or missing). Using local data bank.");
    return BASE_SCENARIOS.slice(0, count).map(s => ({ ...s, template_id: `${s.template_id}_${Math.random()}` }));
  }

  try {
    const prompt = `Generate a list of EXACTLY ${count} cyber-security scenarios for a phishing awareness game.
      CRITICAL: Ensure HIGH RANDOMNESS. Vary the contexts: ecommerce, banking, social media, internal corporate, tech support, etc.
      Include a mix of 'easy', 'medium', and 'hard' difficulties.
      Return a JSON array of objects.
      Each object keys: template_id, difficulty (easy|medium|hard), type (phishing|social_engineering|legitimate), category, sender, subject, body, red_flags, ioc_categories, explanation.
      ioc_categories must be from: [${STANDARD_IOCS.join(", ")}].
      Random Seed: ${Math.random()}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "[]";
    let scenarios = JSON.parse(text);
    
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      throw new Error("Invalid AI response");
    }

    // Clean up ioc_categories to ensure they match our list
    scenarios = scenarios.map((s: any) => ({
      ...s,
      ioc_categories: Array.isArray(s.ioc_categories) 
        ? s.ioc_categories.filter((cat: string) => STANDARD_IOCS.includes(cat))
        : []
    }));

    return scenarios.slice(0, count);
  } catch (error) {
    console.error("AI Generation failed, using fallbacks:", error);
    return BASE_SCENARIOS.slice(0, count).map(s => ({ ...s, template_id: `${s.template_id}_${Math.random()}` }));
  }
}

// --- Interactivity ---
const springTransition = { type: "spring", stiffness: 400, damping: 17 };

// --- Windows Components ---
const WinWindow = ({ title, onClose, children, className = "", width = "auto" }: { title: string, onClose?: () => void, children: React.ReactNode, className?: string, width?: string }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.8, y: 40 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.8, y: 40 }}
    transition={springTransition}
    className={`win-window ${className}`} 
    style={{ width }}
  >
    <div className="win-title-bar">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-fun-cyan/20 rounded-lg group-hover:rotate-12 transition-transform">
          <Monitor size={14} className="text-fun-cyan drop-shadow-sm" />
        </div>
        <span className="tracking-widest uppercase font-black text-xs">{title}</span>
      </div>
      <div className="flex gap-2">
        <button className="win-button p-0 w-6 h-6 flex items-center justify-center bg-fun-yellow hover:bg-fun-yellow/80 transition-transform active:scale-90"><Minimize2 size={14} /></button>
        <button className="win-button p-0 w-6 h-6 flex items-center justify-center bg-fun-cyan hover:bg-fun-cyan/80 transition-transform active:scale-90"><Maximize2 size={14} /></button>
        {onClose && (
          <button 
            onClick={onClose} 
            className="win-button win-button-red p-0 w-6 h-6 flex items-center justify-center bg-fun-pink hover:rotate-12 active:scale-90"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
    <div className="p-1">
      <div className="flex px-3 gap-6 py-2 border-b-3 border-fun-dark/10 mb-2 bg-fun-dark/5 rounded-lg">
        {["Intel", "Scan", "Config", "Support"].map(m => (
          <span key={m} className="text-[10px] font-black uppercase tracking-tighter cursor-pointer hover:text-fun-pink transition-colors">{m}</span>
        ))}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  </motion.div>
);

export default function App() {
  // State
  const [view, setView] = useState<View>("MAIN_MENU");
  const [callsign, setCallsign] = useState(() => localStorage.getItem("callsign") || "");
  const [roomId, setRoomId] = useState("");
  const [playerId] = useState(() => Math.random().toString(36).substring(7));
  const [players, setPlayers] = useState<Player[]>([]);
  const sortedPlayers = React.useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);
  const [hostId, setHostId] = useState("");
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [totalScenarios, setTotalScenarios] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [isSfxEnabled, setIsSfxEnabled] = useState(true);
  const [masterVolume, setMasterVolume] = useState(() => Number(localStorage.getItem("masterVolume")) || 0.5);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [roomConfig, setRoomConfig] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isCountdownOpen, setIsCountdownOpen] = useState(false);

  const targetDate = new Date("2026-05-31T00:00:00");
  const [timeToTarget, setTimeToTarget] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff > 0) {
        setTimeToTarget({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60)
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const clickSfx = useRef<HTMLAudioElement | null>(null);
  const errorSfx = useRef<HTMLAudioElement | null>(null);
  const successSfx = useRef<HTMLAudioElement | null>(null);
  const countdownSfx = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Retro tech ambient loop
    musicRef.current = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
    musicRef.current.loop = true;
    musicRef.current.volume = 0.15 * masterVolume;

    // SFX - Using reliable URLs
    clickSfx.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
    errorSfx.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3");
    successSfx.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3");
    countdownSfx.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3");
    
    // Set volumes
    [clickSfx, errorSfx, successSfx, countdownSfx].forEach(ref => {
      if (ref.current) ref.current.volume = 0.4 * masterVolume;
    });
    
    // Error handling to prevent console spam
    musicRef.current.onerror = () => {
      console.warn("Audio element failed to load source. Silencing audio.");
      setIsMusicEnabled(false);
    };

    return () => {
      musicRef.current?.pause();
      musicRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = 0.15 * masterVolume;
    }
    [clickSfx, errorSfx, successSfx, countdownSfx].forEach(ref => {
      if (ref.current) ref.current.volume = 0.4 * masterVolume;
    });
    localStorage.setItem("masterVolume", masterVolume.toString());
  }, [masterVolume]);

  const playSfx = (type: 'click' | 'error' | 'success' | 'countdown') => {
    if (!isSfxEnabled) return;
    let audio = clickSfx.current;
    if (type === 'error') audio = errorSfx.current;
    if (type === 'success') audio = successSfx.current;
    if (type === 'countdown') audio = countdownSfx.current;
    
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.warn("SFX play failed:", e));
    }
  };

  useEffect(() => {
    if (musicRef.current) {
      if (isMusicEnabled && isAudioStarted) {
        const playPromise = musicRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.warn("Auto-play prevented or source error:", error);
          });
        }
      } else {
        musicRef.current.pause();
      }
    }
  }, [isMusicEnabled, isAudioStarted]);

  const startAudio = () => {
    if (!isAudioStarted) {
      setIsAudioStarted(true);
      playSfx('click');
    }
  };
  const [scenarioEndTime, setScenarioEndTime] = useState<number | null>(null);
  const [checkedIoCs, setCheckedIoCs] = useState<string[]>([]);
  const [callsignError, setCallsignError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const socketRef = useRef<WebSocket | null>(null);

  // --- Socket Logic ---
  const connect = useCallback((rId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}`);
    
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: "JOIN_ROOM",
        payload: { roomId: rId, callsign: callsign || `RECRUIT_${playerId.substring(0,4)}`, playerId }
      }));
    };

    socket.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);
      
      switch (type) {
        case "ROOM_UPDATE":
          setPlayers(payload.players);
          setHostId(payload.hostId);
          setRoomConfig(payload.config);
          break;
        case "GAME_STARTED":
          setCurrentScenario(payload.scenario);
          setScenarioIndex(payload.index);
          setTotalScenarios(payload.total);
          setScenarioEndTime(payload.endTime);
          setCheckedIoCs([]);
          submittedRef.current = false;
          setFeedback(null);
          
          // Start countdown
          setCountdown(3);
          playSfx('countdown');
          break;
        case "SCORE_UPDATE":
          setPlayers(payload.players);
          break;
        case "ANSWER_FEEDBACK":
          setFeedback(payload);
          if (payload.correct) playSfx('success');
          else playSfx('error');
          break;
        case "NEW_SCENARIO":
          setCurrentScenario(payload.scenario);
          setScenarioIndex(payload.index);
          setTotalScenarios(payload.total);
          setScenarioEndTime(payload.endTime);
          setCheckedIoCs([]);
          submittedRef.current = false;
          setFeedback(null);
          break;
        case "GAME_RESULTS":
          setPlayers(payload.players);
          setView("RESULTS");
          playSfx('success');
          break;
        case "ERROR":
          setCallsignError(payload.message);
          playSfx('error');
          setTimeout(() => setCallsignError(null), 3000);
          break;
      }
    };

    socketRef.current = socket;
  }, [callsign, playerId]);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!scenarioEndTime || !roomConfig?.timerEnabled || view !== "GAME" || feedback) {
      return;
    }
    const interval = setInterval(() => {
      const t = Math.max(0, scenarioEndTime - Date.now());
      setTimeLeft(t);
      if (t === 0 && !submittedRef.current) {
        submittedRef.current = true;
        socketRef.current?.send(JSON.stringify({ 
          type: "SUBMIT_ANSWER", 
          payload: { isSafe: true, checkedIoCs: [] } 
        }));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [scenarioEndTime, roomConfig, view, feedback]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // --- Actions ---
  const handleGenerateRoomId = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomId(code);
  };

  const validateCallsign = () => {
    if (!callsign || callsign.trim().length === 0) {
      setCallsignError("NAME REQUIRED");
      setTimeout(() => setCallsignError(null), 3000);
      return false;
    }
    return true;
  };

  const handleRunCampaign = () => {
    if (!validateCallsign()) return;
    const rId = `SOLO_${Math.random().toString(36).substring(7)}`;
    setRoomId(rId);
    connect(rId);
    setView("LOBBY");
  };

  const handleJoinMultiplayer = () => {
    if (!validateCallsign()) return;
    if (!roomId || roomId.trim().length < 3) {
      setCallsignError("INVALID ROOM ID");
      setTimeout(() => setCallsignError(null), 3000);
      return;
    }
    connect(roomId);
    setView("LOBBY");
  };

  const handleStartGame = async () => {
    if (hostId !== playerId) return;
    setIsLoading(true);
    try {
      const scenarios = await generateScenarios(roomConfig?.questionCount || 3);
      socketRef.current?.send(JSON.stringify({ 
        type: "START_GAME", 
        payload: { scenarios } 
      }));
    } catch (err) {
      console.error("Failed to start game:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = (isSafe: boolean) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    socketRef.current?.send(JSON.stringify({ 
      type: "SUBMIT_ANSWER", 
      payload: { isSafe, checkedIoCs } 
    }));
  };

  const handleNextScenario = () => {
    socketRef.current?.send(JSON.stringify({ type: "NEXT_SCENARIO" }));
  };

  const handleReturnToMenu = () => {
    socketRef.current?.close();
    socketRef.current = null;
    setView("MAIN_MENU");
    setRoomId("");
  };

  // --- Countdown Logic ---
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
        setView("GAME");
      }, 500);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
      if (countdown > 1) playSfx('countdown');
      else playSfx('success');
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div 
      className="h-screen w-screen relative flex flex-col p-1 transition-colors duration-500 overflow-hidden select-none retro-bg"
    >
      <div className="scanline" />
      
      {/* Dynamic Floating Shapes for background interaction */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -40, 0],
              x: [0, 20, 0],
              rotate: [0, 180, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "linear",
            }}
            className={`absolute blur-2xl opacity-10 ${i % 2 === 0 ? 'bg-fun-pink' : 'bg-fun-cyan'}`}
            style={{
              width: `${150 + i * 40}px`,
              height: `${150 + i * 40}px`,
              top: `${Math.random() * 80}%`,
              left: `${Math.random() * 80}%`,
              borderRadius: i % 3 === 0 ? '30% 70% 70% 30% / 30% 30% 70% 70%' : '50%',
            }}
          />
        ))}
      </div>

      {/* Desktop Icons */}
      <AnimatePresence>
        {(view === "MAIN_MENU" || view === "LOBBY" || view === "SETTINGS") && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-8 left-8 flex flex-col gap-10 pointer-events-auto select-none z-10"
          >
            {[
              { icon: Timer, label: "JuaraVibe", color: "bg-fun-cyan", onClick: () => setIsCountdownOpen(true) },
              { icon: Info, label: "Credits", color: "bg-fun-pink", onClick: () => setIsCreditsOpen(true) },
              { icon: ImageIcon, label: "photo.jpg", color: "bg-fun-yellow", onClick: () => setIsPhotoOpen(true) }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.1, rotate: idx % 2 === 0 ? 5 : -5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  item.onClick();
                  playSfx('click');
                }}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className={`p-4 ${item.color} rounded-2xl border-4 border-fun-dark shadow-[4px_4px_0_0_#252A34]`}>
                  <item.icon size={32} className="text-fun-dark" />
                </div>
                <span className="text-[12px] font-black tracking-widest uppercase bg-fun-dark text-white px-2 py-0.5 rounded-lg shadow-[2px_2px_0_0_#00ffff]">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {countdown !== null && (
            <motion.div 
              key="countdown-overlay"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 2 }}
              className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            >
              <div className="text-white text-9xl font-black italic drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                {countdown === 0 ? "GO!" : countdown}
              </div>
            </motion.div>
          )}

          {view === "MAIN_MENU" && (
            <motion.div 
              key="view-main-menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-center justify-center min-h-full p-4 overflow-y-auto" 
              onClick={startAudio}
            >
              <WinWindow title="PhidshOS v2.0" width="min(450px, 95vw)">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-6 p-4 bg-fun-cyan/10 rounded-2xl border-3 border-fun-dark">
                    <div className="p-4 bg-fun-cyan rounded-2xl border-3 border-fun-dark shadow-[4px_4px_0_0_#252A34] rotate-3 transition-transform hover:rotate-0">
                      <Shield size={48} className="text-fun-dark" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black italic tracking-tighter text-fun-dark leading-none">CYBER_DEFENSE</h1>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Security Awareness Training</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-fun-dark px-1">Operator Alias:</label>
                      <input 
                        type="text" 
                        value={callsign}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setCallsign(val);
                          localStorage.setItem("callsign", val);
                        }}
                        className="win-input w-full text-sm py-3"
                        placeholder="IDENTIFY YOURSELF..."
                        autoComplete="off"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2">
                      <motion.button 
                        whileHover={{ scale: 1.02, x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          handleRunCampaign();
                          playSfx('click');
                        }} 
                        className="win-button flex items-center justify-center gap-3 py-3"
                      >
                        <Play size={18} fill="currentColor" /> 
                        <span className="text-sm">Initiate Single Player</span>
                      </motion.button>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setView("LOBBY");
                            playSfx('click');
                          }} 
                          className="win-button bg-fun-pink text-white flex items-center justify-center gap-2"
                        >
                          <Users size={16} /> <span className="text-[10px]">Multiplayer</span>
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setView("SETTINGS");
                            playSfx('click');
                          }} 
                          className="win-button bg-fun-yellow flex items-center justify-center gap-2"
                        >
                          <SettingsIcon size={16} /> <span className="text-[10px]">Config</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </WinWindow>
            </motion.div>
          )}

          {view === "SETTINGS" && (
            <motion.div 
              key="view-settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-center justify-center min-h-full p-4 overflow-y-auto"
            >
              <WinWindow title="System Config" onClose={() => setView("MAIN_MENU")} width="min(450px, 95vw)">
                <div className="space-y-6">
                  <div className="win-inset p-4 bg-white border-3 border-fun-dark shadow-[4px_4px_0_0_#252A34]">
                    <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-fun-dark pb-2 mb-4 flex items-center gap-2">
                       <Volume2 size={14} className="text-fun-cyan" /> Audio Core
                    </h3>
                    <div className="flex flex-col gap-4">
                      <label className="flex items-center gap-3 text-xs font-bold cursor-pointer group">
                        <div className={`w-6 h-6 rounded-lg border-3 border-fun-dark flex items-center justify-center transition-colors ${isMusicEnabled ? 'bg-fun-cyan' : 'bg-white'}`}>
                          {isMusicEnabled && <Check size={14} className="text-fun-dark" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={isMusicEnabled} onChange={e => setIsMusicEnabled(e.target.checked)} />
                        BACKGROUND_MUSIC_LOOP
                      </label>
                      <label className="flex items-center gap-3 text-xs font-bold cursor-pointer group">
                        <div className={`w-6 h-6 rounded-lg border-3 border-fun-dark flex items-center justify-center transition-colors ${isSfxEnabled ? 'bg-fun-pink' : 'bg-white'}`}>
                          {isSfxEnabled && <Check size={14} className="text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={isSfxEnabled} onChange={e => setIsSfxEnabled(e.target.checked)} />
                        UI_SFX_FEEDBACK
                      </label>
                    </div>
                  </div>

                  <div className="win-inset p-4 bg-white border-3 border-fun-dark shadow-[4px_4px_0_0_#252A34]">
                    <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-fun-dark pb-2 mb-4 flex items-center gap-2">
                       <Volume2 size={14} className="text-fun-pink" /> System Gain Controls
                    </h3>
                    <div className="flex flex-col gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase opacity-60">
                          <span>Master Output Volume</span>
                          <span>{Math.round(masterVolume * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          value={masterVolume} 
                          onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                          className="w-full h-4 bg-fun-light rounded-lg appearance-none cursor-pointer border-2 border-fun-dark overflow-hidden [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-fun-pink [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-fun-dark"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setView("MAIN_MENU")} 
                      className="win-button w-full py-3 bg-fun-cyan"
                    >
                      APPLY CHANGES
                    </motion.button>
                  </div>
                </div>
              </WinWindow>
            </motion.div>
          )}

          {view === "LOBBY" && (
            <motion.div 
              key="view-lobby"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-center min-h-full p-4 overflow-y-auto"
            >
              <WinWindow title="Net_Link Control" onClose={handleReturnToMenu} width="min(800px, 95vw)">
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-6">
                    <div className="win-inset p-6 bg-white space-y-4">
                      <h3 className="text-lg font-black flex items-center gap-3 border-b-4 border-fun-dark pb-2 uppercase italic tracking-tighter">
                        <Terminal size={20} className="text-fun-cyan" /> Uplink Terminal
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[11px] font-black uppercase tracking-wider px-1">Network_ID</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={roomId} 
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                placeholder="XXXX-XXXX"
                                disabled={!!socketRef.current}
                                className="win-input flex-1 min-w-0 font-mono tracking-widest text-center"
                                autoComplete="off"
                              />
                              {!socketRef.current && (
                                <button 
                                  onClick={() => {
                                    handleGenerateRoomId();
                                    playSfx('click');
                                  }} 
                                  className="win-button p-2" 
                                  title="Gen ID"
                                >
                                  <Search size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-black uppercase tracking-wider px-1">Alias_Tag</label>
                            <input 
                              type="text" 
                              value={callsign}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setCallsign(val);
                                localStorage.setItem("callsign", val);
                              }}
                              disabled={!!socketRef.current} 
                              className="win-input w-full font-bold"
                              autoComplete="off"
                            />
                          </div>
                        </div>

                        {!socketRef.current && (
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              handleJoinMultiplayer();
                              playSfx('click');
                            }} 
                            className="win-button w-full py-3 bg-fun-cyan text-base"
                          >
                            Establish Connection
                          </motion.button>
                        )}
                        
                        {callsignError && <p className="text-xs text-fun-pink font-black uppercase animate-bounce text-center">{callsignError}</p>}
                      </div>
                    </div>

                    {hostId === playerId && roomConfig && (
                      <div className="win-inset p-6 bg-white space-y-4">
                        <h3 className="text-sm font-black border-b-3 border-fun-dark/10 pb-2 uppercase tracking-widest text-fun-dark/60">Session Parameters</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase">Burst Count (Max 20):</label>
                            <input 
                              type="number" 
                              min="1"
                              max="20"
                              value={roomConfig.questionCount} 
                              onChange={e => {
                                let val = parseInt(e.target.value);
                                if (val > 20) val = 20;
                                if (val < 1) val = 1;
                                socketRef.current?.send(JSON.stringify({ type: "UPDATE_CONFIG", payload: { questionCount: val } }));
                              }} 
                              className="win-input w-full" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase">Pulse (sec):</label>
                            <input type="number" min="5" value={roomConfig.roundDuration} onChange={e => socketRef.current?.send(JSON.stringify({ type: "UPDATE_CONFIG", payload: { roundDuration: Math.max(5, parseInt(e.target.value) || 60) } }))} className="win-input w-full" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-5 win-inset flex flex-col bg-white min-h-[400px] overflow-hidden">
                    <div className="bg-fun-dark text-white px-4 py-3 text-xs font-black uppercase tracking-widest flex justify-between shrink-0">
                      <span className="flex items-center gap-2"><Users size={14} className="text-fun-pink" /> Authorized Ops</span>
                      <span className="bg-fun-pink px-2 py-0.5 rounded-lg">{players.length} active</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      <AnimatePresence>
                        {players.map((p, idx) => (
                          <motion.div 
                            key={p.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-3 bg-fun-light rounded-xl border-3 border-fun-dark flex items-center justify-between shadow-[4px_4px_0_0_#252A34]"
                          >
                            <span className="flex items-center gap-3 font-black text-sm">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-fun-dark ${p.id === hostId ? 'bg-fun-yellow' : 'bg-white'}`}>
                                <User size={16} />
                              </div>
                              {p.callsign} {p.id === playerId ? '(YOU)' : ''}
                            </span>
                            {p.id === hostId && <span className="text-[9px] font-black bg-fun-dark text-white px-2 py-1 rounded-full uppercase italic">Command</span>}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <div className="p-6 bg-fun-light border-t-4 border-fun-dark shrink-0">
                      {hostId === playerId ? (
                          <motion.button 
                            whileHover={{ scale: 1.05, rotate: -1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleStartGame} 
                            disabled={players.length === 0 || isLoading} 
                            className="win-button w-full py-4 text-sm bg-fun-pink text-white disabled:opacity-50"
                          >
                            {isLoading ? "CALIBRATING_INTEL..." : "DEPLOY TEAM TO FIELD"}
                          </motion.button>
                      ) : (
                        <div className="text-center p-4 bg-fun-dark/5 rounded-xl border-3 border-dashed border-fun-dark/20">
                          <div className="flex items-center justify-center gap-3 text-xs font-black text-fun-dark/60 italic">
                            <Clock size={16} className="animate-spin-slow" /> AWAITING DEPLOYMENT ORDER...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </WinWindow>
            </motion.div>
          )}

          {view === "GAME" && currentScenario && (
            <motion.div 
              key={`view-game-${scenarioIndex}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="h-full flex flex-col gap-4 p-4 overflow-hidden"
            >
              <AnimatePresence>
                {roomConfig?.timerEnabled && timeLeft < (roomConfig.roundDuration * 1000 * 0.25) && !feedback && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.2, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 z-0 bg-fun-pink pointer-events-none"
                  />
                )}
              </AnimatePresence>

              <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden relative z-10">
                {/* Left Panel: Explorer/Intel */}
                <div className="w-full md:w-64 flex flex-row md:flex-col gap-4 shrink-0">
                  <div className="win-inset flex-1 hidden md:flex min-h-0 bg-white overflow-hidden flex-col shadow-[4px_4px_0_0_#252A34]">
                    <div className="bg-fun-dark text-white px-3 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0">
                      <Trophy size={12} className="text-fun-yellow" /> Live Analytics
                    </div>
                    <div className="p-3 flex-1 overflow-y-auto space-y-2">
                       {sortedPlayers.map((p, i) => (
                        <div key={p.id} className={`p-2 rounded-lg border-2 border-fun-dark flex justify-between items-center ${p.id === playerId ? 'bg-fun-yellow font-black' : 'bg-white font-bold'} text-xs`}>
                          <span className="truncate">#{i+1} {p.callsign}</span>
                          <span className="bg-fun-dark text-white px-2 py-0.5 rounded text-[9px]">{p.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="win-inset h-24 md:h-32 flex-1 md:flex-none bg-fun-dark p-4 flex flex-col justify-center items-center shadow-[4px_4px_0_0_#252A34]">
                    <div className={`text-2xl font-black tabular-nums tracking-tighter ${roomConfig?.timerEnabled && timeLeft < (roomConfig.roundDuration * 1000 * 0.25) ? 'text-fun-pink animate-pulse' : 'text-fun-cyan'}`}>
                      {roomConfig?.timerEnabled && !feedback ? formatTime(timeLeft) : '---'}
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-white opacity-40 mt-1">Uplink Status</div>
                    <div className="w-full h-3 bg-white/10 mt-3 rounded-full border-2 border-white/20 p-0.5 overflow-hidden">
                      <motion.div 
                        className="bg-fun-cyan h-full rounded-full shadow-[0_0_10px_#08D9D6]" 
                        animate={{ width: `${((scenarioIndex + 1) / totalScenarios) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Main Panel: Mail Client */}
                <div className="flex-1 win-window bg-white flex flex-col relative overflow-hidden min-h-0 p-1">
                  <div className="bg-fun-light p-4 flex justify-between items-center rounded-t-xl border-b-3 border-fun-dark shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-fun-pink/10 rounded-xl border-2 border-fun-dark">
                        <Mail size={20} className="text-fun-pink" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-fun-dark/50">Incoming Transmission</span>
                        <h2 className="text-sm font-black leading-tight uppercase tracking-tight text-fun-dark line-clamp-1">{currentScenario.subject}</h2>
                      </div>
                    </div>
                    <div className="bg-fun-dark text-white px-3 py-1.5 rounded-xl font-black text-[10px] tracking-widest shrink-0">
                      MSG_{scenarioIndex + 1}
                    </div>
                  </div>
                  
                  <div className="bg-white border-b-2 border-fun-dark/5 p-4 space-y-1 shrink-0 text-xs font-bold text-fun-dark/70">
                    <div className="flex gap-2">
                       <span className="text-fun-pink/50">SOURCE:</span> <span>{currentScenario.sender}</span>
                    </div>
                    <div className="flex gap-2">
                       <span className="text-fun-pink/50">TARGET:</span> <span>RECRUIT_LOCAL@HUB.NET</span>
                    </div>
                  </div>

                  <div className="flex-1 p-6 md:p-10 overflow-y-auto whitespace-pre-wrap font-fun font-semibold text-base leading-relaxed text-fun-dark bg-fun-light/30">
                    {currentScenario.body}
                  </div>

                  {roomConfig?.analysisEnabled && !feedback && (
                    <div className="p-4 bg-fun-dark text-white shrink-0 rounded-b-xl border-t-3 border-fun-dark">
                      <div className="text-[10px] font-black tracking-widest opacity-40 mb-3 uppercase">Heuristic Analysis (Check active indicators)</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {STANDARD_IOCS.map(ioc => (
                          <label key={ioc} className={`flex items-center gap-3 p-2 rounded-lg border-2 transition-all cursor-pointer ${checkedIoCs.includes(ioc) ? 'bg-fun-pink border-white text-white' : 'bg-white/5 border-transparent hover:bg-white/10'} shadow-none transition-transform active:scale-95`}>
                            <input 
                              type="checkbox" 
                              className="hidden"
                              checked={checkedIoCs.includes(ioc)}
                              onChange={(e) => {
                                if (e.target.checked) setCheckedIoCs([...checkedIoCs, ioc]);
                                else setCheckedIoCs(checkedIoCs.filter(x => x !== ioc));
                                playSfx('click');
                              }}
                            />
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checkedIoCs.includes(ioc) ? 'bg-white border-white' : 'border-white/30'}`}>
                              {checkedIoCs.includes(ioc) && <Check size={10} className="text-fun-pink" />}
                            </div>
                            <span className="text-[10px] font-black truncate">{ioc}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Panel */}
              <div className="h-24 flex gap-4 shrink-0">
                {!feedback ? (
                  <>
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSubmitAnswer(true)} 
                      className="win-button flex-1 bg-fun-cyan text-base flex flex-col justify-center items-center gap-1 shadow-[8px_8px_0_0_#252A34]"
                    >
                      <span className="text-lg">VALIDATE_AUTH</span>
                      <span className="text-[9px] font-black opacity-60">Looks legitimate to me</span>
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSubmitAnswer(false)} 
                      className="win-button flex-1 bg-fun-pink text-white text-base flex flex-col justify-center items-center gap-1 shadow-[8px_8px_0_0_#252A34]"
                    >
                      <span className="text-lg">REPORT_THREAT</span>
                      <span className="text-[9px] font-black opacity-60 italic">{checkedIoCs.length} INDICATORS FLAGGED</span>
                    </motion.button>
                  </>
                ) : (
                  <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`flex-1 p-4 rounded-2xl border-4 border-fun-dark shadow-[8px_8px_0_0_#252A34] flex items-center justify-between gap-6 ${feedback.correct ? 'bg-fun-cyan' : 'bg-fun-pink text-white'}`}
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-white border-2 border-fun-dark flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,0.2)]">
                         {feedback.correct ? <Check size={32} className="text-fun-cyan" /> : <AlertTriangle size={32} className="text-fun-pink" />}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xl font-black italic tracking-tighter uppercase leading-none">
                          {feedback.correct ? 'INTEGRITY_SUCCESS' : 'PROTOCOL_FAILURE'}
                        </h4>
                        <p className="text-xs font-bold opacity-80 leading-tight max-w-xl">{feedback.explanation}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {feedback.scoreGained !== undefined && (
                        <div className="text-2xl font-black italic">+{feedback.scoreGained}</div>
                      )}
                      {hostId === playerId ? (
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleNextScenario} 
                          className="win-button py-2 px-8 bg-white text-fun-dark"
                        >
                          CONTINUE
                        </motion.button>
                      ) : (
                        <div className="text-[10px] font-black uppercase text-center w-32 opacity-60 italic">Awaiting Next Intel Burst...</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {view === "RESULTS" && (
            <motion.div 
              key="view-results"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center min-h-full p-4 overflow-y-auto"
            >
              <WinWindow title="Operational Report" onClose={handleReturnToMenu} width="min(500px, 95vw)">
                <div className="space-y-6 text-center">
                  <div className="p-6 bg-fun-cyan rounded-2xl border-4 border-fun-dark shadow-[8px_8px_0_0_#252A34] -rotate-2">
                    <Trophy size={64} className="mx-auto mb-4 text-fun-yellow drop-shadow-[0_4px_0_#252A34]" />
                    <h2 className="text-4xl font-black tracking-tighter italic">FIN_MISSION</h2>
                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Session Summarized</p>
                  </div>

                  <div className="win-inset p-6 bg-white space-y-4 shadow-[4px_4px_0_0_#252A34]">
                    <h3 className="text-sm font-black uppercase tracking-widest border-b-2 border-fun-dark pb-2">Final Rankings</h3>
                    <div className="space-y-2">
                      {sortedPlayers.map((p, i) => (
                        <motion.div 
                          key={p.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`flex items-center justify-between p-3 rounded-xl border-3 border-fun-dark ${i === 0 ? 'bg-fun-yellow' : 'bg-white'}`}
                        >
                          <span className="font-black flex items-center gap-3">
                            <span className="w-6 text-xl">{i === 0 ? '👑' : i+1}</span>
                            {p.callsign}
                          </span>
                          <span className="text-lg font-black">{p.score} pts</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={handleReturnToMenu} className="win-button flex-1 py-4 bg-fun-dark text-white text-base">Return to Base</button>
                  </div>
                </div>
              </WinWindow>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCountdownOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-50 p-4 bg-fun-dark/60 backdrop-blur-sm"
              onClick={() => setIsCountdownOpen(false)}
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <WinWindow title="#JuaraVibeCoding Countdown" onClose={() => setIsCountdownOpen(false)} width="400px">
                  <div className="text-center p-6 bg-fun-dark rounded-xl border-4 border-white/20">
                    <h2 className="text-fun-cyan text-4xl font-black italic tracking-tighter mb-4">MAY 31, 2026</h2>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { val: timeToTarget.days, label: "DAYS" },
                        { val: timeToTarget.hours, label: "HRS" },
                        { val: timeToTarget.minutes, label: "MIN" },
                        { val: timeToTarget.seconds, label: "SEC" }
                      ].map(t => (
                        <div key={t.label} className="bg-white/10 p-2 rounded-lg border-2 border-white/5">
                          <div className="text-2xl font-black text-white">{t.val.toString().padStart(2, '0')}</div>
                          <div className="text-[8px] text-white/40 font-black tracking-widest">{t.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 text-fun-pink font-black animate-pulse text-xs tracking-widest">SYSTEM_INITIALIZING...</div>
                  </div>
                </WinWindow>
              </motion.div>
            </motion.div>
          )}

          {isCreditsOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-50 p-4 bg-fun-dark/60 backdrop-blur-sm"
              onClick={() => setIsCreditsOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <WinWindow title="System Credits" onClose={() => setIsCreditsOpen(false)} width="400px">
                  <div className="space-y-4 p-4 text-center">
                    <div className="p-6 bg-white border-3 border-fun-dark rounded-2xl shadow-[8px_8px_0_0_#FF2E63]">
                      <div className="text-[10px] font-black tracking-widest text-fun-pink mb-2">AUTHORED_BY</div>
                      <h2 className="text-2xl font-black italic text-fun-dark">mythios</h2>
                      <div className="mt-4 pt-4 border-t-2 border-fun-dark/10">
                        <div className="text-[10px] font-black tracking-widest opacity-40">POWERED_BY</div>
                        <div className="text-sm font-black text-fun-cyan underline decoration-4 underline-offset-4">Google AI Studio</div>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-fun-dark/60 leading-relaxed italic">
                      "Crafted with precision, powered by silicon, fueled by creativity."
                    </p>
                  </div>
                </WinWindow>
              </motion.div>
            </motion.div>
          )}

          {isPhotoOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-50 p-4 bg-fun-dark/60 backdrop-blur-sm"
              onClick={() => setIsPhotoOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <WinWindow title="photo.jpg" onClose={() => setIsPhotoOpen(false)} width="500px">
                  <div className="p-2 bg-white rounded-xl overflow-hidden border-3 border-fun-dark shadow-[12px_12px_0_0_#252A34]">
                    <img 
                      src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=1000" 
                      alt="Cyber Cat" 
                      className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-500 rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                    <div className="mt-4 p-3 bg-fun-dark text-white rounded-lg flex justify-between items-center">
                      <span className="text-[10px] font-black italic">CAT_SCAN_COMPLETE.EXE</span>
                      <span className="text-[10px] font-black opacity-40">1024x1024</span>
                    </div>
                  </div>
                </WinWindow>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Taskbar */}
      <footer className="h-16 px-4 pb-4 relative z-50 shrink-0 mt-auto">
        <div className="h-full bg-fun-dark/95 backdrop-blur-xl border-3 border-fun-dark rounded-3xl p-2 flex gap-3 shadow-[8px_8px_0_0_rgba(0,0,0,0.4)]">
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="win-button bg-fun-pink text-white px-6 flex items-center gap-3 font-black shadow-none border-0"
          >
            <div className="w-4 h-4 bg-fun-yellow rounded-full animate-ping" /> 
            <span className="tracking-tighter">START</span>
          </motion.button>
          
          <div className="flex-1 flex gap-2 px-4 border-l-3 border-white/10 overflow-x-auto no-scrollbar items-center">
             <motion.div 
               whileHover={{ y: -4 }}
               className={`h-10 px-6 flex items-center gap-3 bg-white rounded-2xl border-3 border-fun-dark shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all ${view === 'GAME' ? 'bg-fun-yellow' : 'bg-white opacity-80'}`}
             >
                <Mail size={18} className="text-fun-dark" /> 
                <span className="text-xs font-black uppercase tracking-tight">Mail_Hub.ipa</span>
             </motion.div>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-black uppercase text-white px-6">
            <div className="flex items-center gap-3">
              {masterVolume === 0 ? <VolumeX size={16} className="text-fun-pink" /> : <Volume2 size={16} className="text-fun-cyan" />}
              <div className="w-16 h-3 bg-white/10 rounded-full border-2 border-white/20 p-0.5 overflow-hidden">
                <motion.div 
                  animate={{ width: `${masterVolume * 100}%` }}
                  className={`h-full rounded-full ${masterVolume > 0.7 ? 'bg-fun-pink' : 'bg-fun-cyan'}`} 
                />
              </div>
            </div>
            <span className="tabular-nums font-black text-fun-pink">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
