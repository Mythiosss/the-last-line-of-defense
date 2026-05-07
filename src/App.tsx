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
  ChevronLeft,
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
import { Player, Scenario, Feedback, View } from "./types";
import { BASE_SCENARIOS } from "./data/scenarios";

// --- AI Setup --

const STANDARD_IOCS = [
  "Suspicious Sender Address",
  "Suspicious Links/URLs",
  "Sense of Urgency/Fear",
  "Request for Sensitive Info",
  "Spelling/Grammar Errors",
  "Unexpected Attachment"
];

const getFallbackScenarios = (reqCount: number) => {
  const companies = ["Globex", "Initech", "Soylent Corp", "Hooli", "Stark Ind", "Waystar", "Umbrella", "Dunder"];
  const workers = ["Alice", "Bob", "Charlie", "Diana", "Edward", "Fiona", "George", "Hannah"];
  
  const results: Scenario[] = [];
  const pool = [...BASE_SCENARIOS];
  
  // Shuffle the pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  for (let i = 0; i < reqCount; i++) {
    const base = pool[i % pool.length];
    const co = companies[i % companies.length];
    const worker = workers[i % workers.length];
    
    // Dynamic content variation to prevent exact repetition
    let body = base.body.replace(/company/gi, co).replace(/internal portal/gi, `${co} Vault`);
    let sender = base.sender.replace(/company/gi, co.toLowerCase().replace(/\s/g, '-'));
    let subject = base.subject.replace(/Your account/gi, `${worker}'s Account`);

    results.push({
      ...base,
      template_id: `${base.template_id}_fall_${i}_${Math.random().toString(36).substring(7)}`,
      subject: i >= pool.length ? `[LOG] ${subject} (Session_${i+1})` : subject,
      sender,
      body
    });
  }
  return results;
};

// Gemini Loading Star Component
const GeminiStar = ({ className = "", size = 24 }: { className?: string, size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path 
      d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" 
      fill="currentColor" 
    />
  </svg>
);

async function generateScenarios(count = 5, onAiStatus?: (status: 'loading' | 'success' | 'busy') => void): Promise<Scenario[]> {
  if (onAiStatus) onAiStatus('loading');
  try {
    const res = await fetch(`/api/scenarios?count=${count}`);
    if (!res.ok) throw new Error("Server error");
    const scenarios = await res.json();
    if (!Array.isArray(scenarios) || scenarios.length === 0) throw new Error("Empty");
    if (onAiStatus) onAiStatus('success');
    return scenarios;
  } catch (err) {
    console.warn("AI unavailable, using fallback:", err);
    if (onAiStatus) onAiStatus('busy');
    // Keep showing "busy" for a moment before returning fallback
    await new Promise(resolve => setTimeout(resolve, 2000));
    return getFallbackScenarios(count);
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
    className={`win-window ${className} w-fit max-w-[95vw] overflow-hidden`} 
    style={{ width: width !== "auto" ? width : undefined }}
  >
    <div className="win-title-bar">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="p-1 md:p-1.5 bg-fun-cyan/20 rounded-lg group-hover:rotate-12 transition-transform">
          <Monitor size={12} className="text-fun-cyan drop-shadow-sm md:w-[14px] md:h-[14px]" />
        </div>
        <span className="tracking-widest uppercase font-black text-[10px] md:text-xs">{title}</span>
      </div>
      <div className="flex gap-1.5 md:gap-2">
        <button className="win-button p-0 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-fun-yellow hover:bg-fun-yellow/80 transition-transform active:scale-90"><Minimize2 size={12} className="md:w-[14px] md:h-[14px]" /></button>
        <button className="win-button p-0 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-fun-cyan hover:bg-fun-cyan/80 transition-transform active:scale-90"><Maximize2 size={12} className="md:w-[14px] md:h-[14px]" /></button>
        {onClose && (
          <button 
            onClick={onClose} 
            className="win-button win-button-red p-0 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-fun-pink hover:rotate-12 active:scale-90 font-bold"
          >
            <X size={12} className="md:w-[14px] md:h-[14px]" />
          </button>
        )}
      </div>
    </div>
    <div className="p-0.5 md:p-1">
      <div className="flex px-2 md:px-3 gap-4 md:gap-6 py-1.5 md:py-2 border-b-2 md:border-b-3 border-fun-dark/10 mb-1 md:mb-2 bg-fun-dark/5 rounded-lg overflow-x-auto no-scrollbar">
        {["Intel", "Scan", "Config", "Support"].map(m => (
          <span key={m} className="text-[8px] md:text-[10px] font-black uppercase tracking-tighter cursor-pointer hover:text-fun-pink transition-colors shrink-0">{m}</span>
        ))}
      </div>
      <div className="p-2 md:p-4 max-h-[70vh] md:max-h-none overflow-y-auto custom-scrollbar">
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
  const activePlayers = React.useMemo(() => players.filter(p => !p.isSpectator), [players]);
  const allAnswered = React.useMemo(() => activePlayers.every(p => p.hasAnswered), [activePlayers]);
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
  const [aiStatus, setAiStatus] = useState<'loading' | 'success' | 'busy'>('loading');
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isCountdownOpen, setIsCountdownOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettingsInPause, setShowSettingsInPause] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isAnalysisMinimized, setIsAnalysisMinimized] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Optional: Auto-open sidebar when resizing to desktop
      if (!mobile) setIsSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
  const wrongSfx = useRef<HTMLAudioElement | null>(null);
  const countdownSfx = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Retro tech ambient loop
    musicRef.current = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
    musicRef.current.loop = true;
    musicRef.current.volume = 0.15 * masterVolume;

    // SFX - Using reliable URLs
    clickSfx.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
    errorSfx.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3");
    successSfx.current = new Audio("https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3"); // Lighter success
    wrongSfx.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3"); // Shorter, lower pitched error
    countdownSfx.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3");
    
    // Set volumes
    [clickSfx, errorSfx, successSfx, wrongSfx, countdownSfx].forEach(ref => {
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
    [clickSfx, errorSfx, successSfx, wrongSfx, countdownSfx].forEach(ref => {
      if (ref.current) ref.current.volume = 0.4 * masterVolume;
    });
    localStorage.setItem("masterVolume", masterVolume.toString());
  }, [masterVolume]);

  const playSfx = (type: 'click' | 'error' | 'success' | 'wrong' | 'countdown') => {
    if (!isSfxEnabled) return;
    let audio = clickSfx.current;
    if (type === 'error') audio = errorSfx.current;
    if (type === 'success') audio = successSfx.current;
    if (type === 'wrong') audio = wrongSfx.current;
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
      setIsSocketConnected(true);
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
          if (payload.state === "lobby") {
            setView("LOBBY");
          }
          break;
        case "GAME_STARTED":
          setCurrentScenario(payload.scenario);
          setScenarioIndex(payload.index);
          setTotalScenarios(payload.total);
          setScenarioEndTime(payload.endTime);
          setCheckedIoCs([]);
          submittedRef.current = false;
          setFeedback(null);
          setIsSidebarOpen(false);
          
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
          else playSfx('wrong');
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
    if (!scenarioEndTime || !roomConfig?.timerEnabled || view !== "GAME" || feedback || isPaused) {
      return;
    }
    const interval = setInterval(() => {
      const t = Math.max(0, scenarioEndTime - Date.now());
      setTimeLeft(t);
      if (t === 0 && !submittedRef.current) {
        submittedRef.current = true;
        socketRef.current?.send(JSON.stringify({ 
          type: "SUBMIT_ANSWER", 
          payload: { isSafe: false, checkedIoCs: [], timeout: true } 
        }));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [scenarioEndTime, roomConfig, view, feedback, isPaused]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isPaused) {
      setPauseStartTime(Date.now());
    } else if (pauseStartTime && scenarioEndTime) {
      const pauseDuration = Date.now() - pauseStartTime;
      setScenarioEndTime(scenarioEndTime + pauseDuration);
      setPauseStartTime(null);
    }
  }, [isPaused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "GAME") {
          setIsPaused(prev => !prev);
          setShowSettingsInPause(false);
          playSfx('click');
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view]);

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
    setAiStatus('loading');
    try {
      const scenarios = await generateScenarios(roomConfig?.questionCount || 3, (status) => setAiStatus(status));
      socketRef.current?.send(JSON.stringify({ 
        type: "START_GAME", 
        payload: { scenarios } 
      }));
    } catch (err) {
      console.error("Failed to start game:", err);
      setAiStatus('busy');
    } finally {
      // Small delay to let the user see the "success" or "busy" state
      setTimeout(() => setIsLoading(false), 1500);
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
    setIsSocketConnected(false);
    setView("MAIN_MENU");
    setRoomId("");
    setPlayers([]);
    setHostId("");
    setCurrentScenario(null);
    setScenarioIndex(0);
    setTotalScenarios(0);
    setFeedback(null);
    setRoomConfig(null);
    setCheckedIoCs([]);
    setCountdown(null);
    setIsLoading(false);
    setScenarioEndTime(null);
  };

  const handleReturnToRoom = () => {
    if (hostId === playerId) {
      socketRef.current?.send(JSON.stringify({ type: "BACK_TO_LOBBY" }));
    } else {
      setView("LOBBY");
    }
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

      {/* Desktop Icons / Mobile Side Nav */}
      <AnimatePresence>
        {(view === "MAIN_MENU" || view === "LOBBY" || view === "SETTINGS") && (
          <>
            {/* Small Toggle Button for Mobile/Tablet */}
            {isMobile && (
              <motion.button
                initial={false}
                animate={{ 
                  left: isSidebarOpen ? 230 : 12,
                  rotate: isSidebarOpen ? 0 : 0
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={() => {
                  setIsSidebarOpen(!isSidebarOpen);
                  playSfx('click');
                }}
                className="fixed top-4 z-[70] w-8 h-8 bg-fun-dark border-2 border-fun-cyan rounded-md flex items-center justify-center text-fun-cyan shadow-[2px_2px_0_0_#00ffff] lg:hidden"
              >
                {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </motion.button>
            )}

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
                />
              )}
            </AnimatePresence>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`absolute top-4 left-4 lg:top-8 lg:left-8 flex flex-col gap-6 lg:gap-10 pointer-events-auto select-none z-[60] transition-all duration-500 ease-out 
                ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}
                max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:h-screen max-lg:w-64 max-lg:bg-fun-dark/95 max-lg:p-8 max-lg:pt-24 max-lg:border-r-4 max-lg:border-fun-cyan max-lg:shadow-[20px_0_50px_rgba(0,0,0,0.8)]`}
            >
              {/* Mobile Only Header */}
              <div className="lg:hidden flex flex-col gap-1 mb-8 pb-6 border-b-2 border-white/10 uppercase italic">
                <h2 className="text-fun-cyan text-xl font-black tracking-tighter">System_Applications</h2>
                <p className="text-white/40 text-[10px] font-bold">Authorized Personnel Only</p>
              </div>

              {[
                { icon: Monitor, label: "Home", color: "bg-fun-cyan", onClick: () => { handleReturnToMenu(); setIsSidebarOpen(false); } },
                { icon: Timer, label: "Juara", color: "bg-fun-cyan", onClick: () => { setIsCountdownOpen(true); setIsSidebarOpen(false); } },
                { icon: Info, label: "Credits", color: "bg-fun-pink", onClick: () => { setIsCreditsOpen(true); setIsSidebarOpen(false); } },
                { icon: ImageIcon, label: "photo", color: "bg-fun-yellow", onClick: () => { setIsPhotoOpen(true); setIsSidebarOpen(false); } }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  whileHover={{ scale: 1.1, rotate: idx % 2 === 0 ? 5 : -5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    item.onClick();
                    playSfx('click');
                  }}
                  className="flex flex-row lg:flex-col items-center gap-4 lg:gap-1 group cursor-pointer"
                >
                  <div className={`p-3 lg:p-4 ${item.color} rounded-xl lg:rounded-2xl border-3 lg:border-4 border-fun-dark shadow-[3px_3px_0_0_#252A34] lg:shadow-[4px_4px_0_0_#252A34]`}>
                    <item.icon size={24} className="text-fun-dark lg:w-8 lg:h-8" />
                  </div>
                  <span className="text-[10px] lg:text-[10px] font-black tracking-widest uppercase bg-fun-dark text-white px-2 py-0.5 lg:px-1.5 lg:py-0.5 rounded shadow-[1px_1px_0_0_#00ffff] border border-white/10">
                    {item.label}
                  </span>
                </motion.div>
              ))}

              {/* Mobile Only Footer */}
              <div className="mt-auto lg:hidden pt-6 border-t-2 border-white/10 flex flex-col gap-4">
                 <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="win-button w-full py-3 bg-fun-pink text-white text-xs flex items-center justify-center gap-2"
                 >
                   <X size={16} /> CLOSE_MENU
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence>
          {isPaused && (
            <motion.div 
              key="pause-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[110] flex items-center justify-center bg-fun-dark/80 backdrop-blur-md p-4"
            >
              <WinWindow title="System Paused" width="min(400px, 95vw)">
                <div className="flex flex-col gap-4">
                  {!showSettingsInPause ? (
                    <>
                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={() => { setIsPaused(false); playSfx('click'); }}
                          className="win-button py-3 bg-fun-cyan text-sm flex items-center justify-center gap-2"
                        >
                          <Play size={16} fill="currentColor" /> RESUME MISSION
                        </button>
                        <button 
                          onClick={() => { setShowSettingsInPause(true); playSfx('click'); }}
                          className="win-button py-3 bg-fun-yellow text-sm flex items-center justify-center gap-2"
                        >
                          <SettingsIcon size={16} /> SYSTEM CONFIG
                        </button>
                        <button 
                          onClick={() => { 
                            setIsPaused(false); 
                            handleReturnToMenu(); 
                            playSfx('click'); 
                          }}
                          className="win-button py-3 bg-fun-pink text-white text-sm flex items-center justify-center gap-2"
                        >
                          <X size={16} /> ABORT TO MENU
                        </button>
                      </div>
                      <p className="text-[10px] text-center font-black uppercase tracking-widest opacity-40">Operator: {callsign || 'UNKNOWN'}</p>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="win-inset p-4 bg-white border-3 border-fun-dark shadow-[4px_4px_0_0_#252A34]">
                        <h3 className="text-xs font-black uppercase mb-3 border-b-2 border-fun-dark pb-1 text-fun-pink">Gain Controls</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase opacity-60">
                            <span>Output Volume</span>
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
                      <button 
                        onClick={() => setShowSettingsInPause(false)}
                        className="win-button w-full py-2 bg-fun-cyan text-[10px]"
                      >
                        BACK TO PAUSE MENU
                      </button>
                    </div>
                  )}
                </div>
              </WinWindow>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div 
              key="loading-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[200] bg-fun-dark/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="relative mb-12">
                {/* Gemini Star Animation */}
                <motion.div
                  animate={{ 
                    rotate: [0, 90, 180, 270, 360],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="text-fun-cyan"
                >
                  <GeminiStar size={80} />
                </motion.div>
                
                {/* Pulsing Aura */}
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-fun-cyan blur-3xl rounded-full"
                />

                {/* Satellite stars */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      rotate: [i * 120, i * 120 + 360],
                      scale: [0.5, 0.8, 0.5]
                    }}
                    transition={{ duration: 3 + i, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0"
                  >
                    <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 text-fun-pink">
                       <GeminiStar size={20} />
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-4 max-w-sm">
                <motion.h2 
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-2xl font-black italic tracking-tighter text-white uppercase"
                >
                  {aiStatus === 'loading' ? 'Generating Intel' : aiStatus === 'success' ? 'Transmission Ready' : 'Gemini is busy'}
                </motion.h2>
                
                <p className="text-xs font-bold text-fun-cyan/60 tracking-widest uppercase">
                  {aiStatus === 'loading' 
                    ? 'Consulting Gemini Neural Network...' 
                    : aiStatus === 'success' 
                      ? 'AI successfully generated mission parameters.' 
                      : 'Gemini is busy for now. Reverting to backup protocols...'}
                </p>

                <div className="w-48 h-1 bg-white/10 mx-auto rounded-full mt-6 p-0.5 overflow-hidden border border-white/5">
                  <motion.div 
                    className={`h-full rounded-full ${aiStatus === 'busy' ? 'bg-fun-pink' : 'bg-fun-cyan'}`}
                    initial={{ width: 0 }}
                    animate={{ width: aiStatus === 'loading' ? '80%' : '100%' }}
                    transition={{ duration: aiStatus === 'loading' ? 10 : 0.5 }}
                  />
                </div>
              </div>

              <div className="absolute bottom-12 text-[10px] font-black uppercase tracking-[0.3em] opacity-20">
                Authorized_AI_System_v4.5
              </div>
            </motion.div>
          )}

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
              className="flex flex-col items-center justify-center min-h-full p-4 overflow-y-auto pt-20 lg:pt-0"
              onClick={startAudio}
            >
              <WinWindow title="PhidshOS v2.0" width="min(450px, 95vw)">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4 md:gap-6 p-4 bg-fun-cyan/10 rounded-2xl border-3 border-fun-dark">
                    <div className="p-3 md:p-4 bg-fun-cyan rounded-2xl border-3 border-fun-dark shadow-[4px_4px_0_0_#252A34] rotate-3 transition-transform hover:rotate-0">
                      <Shield size={32} className="text-fun-dark md:w-12 md:h-12" />
                    </div>
                    <div>
                      <h1 className="text-lg md:text-2xl font-black italic tracking-tighter text-fun-dark leading-none uppercase">CYBER_DEFENSE</h1>
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60">Security Awareness Training</p>
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
              className="flex flex-col items-center justify-center min-h-full p-4 overflow-y-auto pt-20 lg:pt-0"
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
              className="flex flex-col items-center justify-center min-h-full p-4 overflow-y-auto pt-20 lg:pt-0"
            >
              <WinWindow title="Net_Link Control" onClose={handleReturnToMenu} width="min(800px, 95vw)">
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6">
                  <div className="lg:col-span-7 space-y-4 lg:space-y-6">
                    <div className="win-inset p-4 lg:p-6 bg-white space-y-4">
                      <h3 className="text-base lg:text-lg font-black flex items-center gap-3 border-b-4 border-fun-dark pb-2 uppercase italic tracking-tighter">
                        <Terminal size={18} className="text-fun-cyan lg:w-5 lg:h-5" /> Uplink Terminal
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
                                disabled={isSocketConnected}
                                className="win-input flex-1 min-w-0 font-mono tracking-widest text-center"
                                autoComplete="off"
                              />
                              {!isSocketConnected && (
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
                              disabled={isSocketConnected} 
                              className="win-input w-full font-bold"
                              autoComplete="off"
                            />
                          </div>
                        </div>

                        {!isSocketConnected && (
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
                    
                    {players.find(p => p.id === playerId)?.isSpectator && roomConfig && (
                      <div className="win-inset p-6 bg-fun-pink/10 border-fun-pink/30 space-y-4">
                        <h3 className="text-lg font-black flex items-center gap-3 border-b-4 border-fun-pink pb-2 uppercase italic tracking-tighter text-fun-pink">
                           <Clock size={20} className="animate-spin-slow" /> Waiting Room
                        </h3>
                        <p className="text-xs font-bold leading-relaxed">
                          A mission is currently in progress. You have been placed in the waiting room and will be deployed in the next operational window.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-5 win-inset flex flex-col bg-white min-h-[300px] lg:min-h-[400px] overflow-hidden">
                    <div className="bg-fun-dark text-white px-4 py-3 text-[10px] font-black uppercase tracking-widest flex justify-between shrink-0">
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
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-fun-dark ${p.id === hostId ? 'bg-fun-yellow' : p.isSpectator ? 'bg-fun-pink' : 'bg-white'}`}>
                                <User size={16} className={p.isSpectator ? 'text-white' : ''} />
                              </div>
                              <span className={p.isSpectator ? 'opacity-50' : ''}>
                                {p.callsign} {p.id === playerId ? '(YOU)' : ''}
                              </span>
                            </span>
                            <div className="flex gap-2">
                              {p.isSpectator && <span className="text-[8px] font-black bg-fun-pink text-white px-2 py-0.5 rounded-full uppercase">Waiting</span>}
                              {p.id === hostId && <span className="text-[9px] font-black bg-fun-dark text-white px-2 py-1 rounded-full uppercase italic">Command</span>}
                            </div>
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

              <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative z-10">
                {/* Left Panel: Explorer/Intel */}
                <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-3 lg:gap-4 shrink-0">
                  <div className="win-inset flex-1 hidden sm:flex min-h-0 bg-white overflow-hidden flex-col shadow-[4px_4px_0_0_#252A34]">
                    <div className="bg-fun-dark text-white px-3 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0">
                      <Trophy size={12} className="text-fun-yellow" /> Live Analytics
                    </div>
                    <div className="p-2 lg:p-3 flex-1 overflow-y-auto space-y-1.5 lg:space-y-2">
                       {sortedPlayers.map((p, i) => (
                        <div key={p.id} className={`p-1.5 lg:p-2 rounded-lg border-2 border-fun-dark flex justify-between items-center ${p.id === playerId ? 'bg-fun-yellow font-black' : 'bg-white font-bold'} text-[10px] lg:text-xs`}>
                          <span className="truncate max-w-[80px] lg:max-w-none">#{i+1} {p.callsign}</span>
                          <span className="bg-fun-dark text-white px-1.5 py-0.5 rounded text-[8px] lg:text-[9px]">{p.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="win-inset h-20 sm:h-24 lg:h-32 flex-1 lg:flex-none bg-fun-dark p-3 lg:p-4 flex flex-col justify-center items-center shadow-[4px_4px_0_0_#252A34]">
                    <div className={`text-xl lg:text-2xl font-black tabular-nums tracking-tighter ${roomConfig?.timerEnabled && timeLeft < (roomConfig.roundDuration * 1000 * 0.25) ? 'text-fun-pink animate-pulse' : 'text-fun-cyan'}`}>
                      {roomConfig?.timerEnabled && !feedback ? formatTime(timeLeft) : '---'}
                    </div>
                    <div className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-white opacity-40 mt-0.5 lg:mt-1">Uplink Status</div>
                    <div className="w-full h-2 lg:h-3 bg-white/10 mt-2 lg:mt-3 rounded-full border-2 border-white/20 p-0.5 overflow-hidden">
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
                    <div className="flex items-center gap-3">
                      {roomId && (
                        <div 
                          className="hidden sm:flex items-center gap-2 bg-fun-cyan/10 border-2 border-fun-dark px-2 py-1.5 rounded-xl cursor-pointer hover:bg-white transition-all shadow-[2px_2px_0_0_#252A34] active:translate-x-0.5 active:translate-y-0.5"
                          onClick={() => {
                            navigator.clipboard.writeText(roomId);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                            playSfx('click');
                          }}
                        >
                          <Terminal size={14} className="text-fun-pink" />
                          <span className="text-[10px] font-black font-mono tracking-widest text-fun-dark">{copied ? 'COPIED!' : roomId}</span>
                        </div>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 180 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setIsPaused(true); playSfx('click'); }}
                        className="p-1.5 bg-fun-dark text-white rounded-lg hover:text-fun-cyan transition-colors"
                        title="Pause (Esc)"
                      >
                        <Lock size={14} />
                      </motion.button>
                      <div className="bg-fun-dark text-white px-3 py-1.5 rounded-xl font-black text-[10px] tracking-widest shrink-0 shadow-[4px_4px_0_0_#252A34]">
                        MSG_{scenarioIndex + 1}
                      </div>
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

                  <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-10 overflow-y-auto whitespace-pre-wrap font-fun font-semibold text-sm md:text-base leading-relaxed text-fun-dark bg-fun-light/30">
                    {currentScenario.body}
                  </div>

                  {roomConfig?.analysisEnabled && !feedback && (
                    <div className={`bg-fun-dark text-white shrink-0 rounded-b-xl border-t-3 border-fun-dark transition-all duration-300 ${isAnalysisMinimized ? 'h-10' : 'p-3 md:p-4'}`}>
                      <div 
                        className="flex justify-between items-center cursor-pointer mb-2"
                        onClick={() => setIsAnalysisMinimized(!isAnalysisMinimized)}
                      >
                        <div className="text-[9px] font-black tracking-widest opacity-40 uppercase flex items-center gap-2">
                          <Terminal size={10} /> {isAnalysisMinimized ? 'ANALYSIS_PAUSED' : 'Heuristic Analysis (Check active indicators)'}
                        </div>
                        <div className="text-[8px] font-black bg-white/10 px-2 py-0.5 rounded hover:bg-white/20 transition-colors uppercase">
                          {isAnalysisMinimized ? 'MAXIMIZE' : 'MINIMIZE'}
                        </div>
                      </div>
                      {!isAnalysisMinimized && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {STANDARD_IOCS.map(ioc => (
                            <label key={ioc} className={`flex items-center gap-2 p-1.5 rounded-lg border-2 transition-all cursor-pointer ${checkedIoCs.includes(ioc) ? 'bg-fun-pink border-white text-white' : 'bg-white/5 border-transparent hover:bg-white/10'} active:scale-95`}>
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
                              <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${checkedIoCs.includes(ioc) ? 'bg-white border-white' : 'border-white/30'}`}>
                                {checkedIoCs.includes(ioc) && <Check size={8} className="text-fun-pink" />}
                              </div>
                              <span className="text-[9px] font-black truncate">{ioc}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Panel */}
              <div className="h-20 md:h-24 flex gap-2 md:gap-4 shrink-0">
                {!feedback ? (
                  <>
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSubmitAnswer(true)} 
                      className="win-button flex-1 bg-fun-cyan text-base flex flex-col justify-center items-center gap-0.5 md:gap-1 shadow-[4px_4px_0_0_#252A34] md:shadow-[8px_8px_0_0_#252A34]"
                    >
                      <span className="text-xs md:text-lg">VALIDATE_AUTH</span>
                      <span className="text-[7px] md:text-[9px] font-black opacity-60">Looks legitimate</span>
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSubmitAnswer(false)} 
                      className="win-button flex-1 bg-fun-pink text-white text-base flex flex-col justify-center items-center gap-0.5 md:gap-1 shadow-[4px_4px_0_0_#252A34] md:shadow-[8px_8px_0_0_#252A34]"
                    >
                      <span className="text-xs md:text-lg">REPORT_THREAT</span>
                      <span className="text-[7px] md:text-[9px] font-black opacity-60 italic">{checkedIoCs.length} INDICATORS FLAGGED</span>
                    </motion.button>
                  </>
                ) : (
                  <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`flex-1 p-3 md:p-4 rounded-xl md:rounded-2xl border-3 md:border-4 border-fun-dark shadow-[4px_4px_0_0_#252A34] md:shadow-[8px_8px_0_0_#252A34] flex items-center justify-between gap-3 md:gap-6 ${feedback.correct ? 'bg-fun-cyan' : 'bg-fun-pink text-white'}`}
                  >
                    <div className="flex items-center gap-3 md:gap-6 min-w-0">
                      <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white border-2 border-fun-dark flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]">
                         {feedback.correct ? <Check size={20} className="text-fun-cyan md:w-8 md:h-8" /> : <AlertTriangle size={20} className="text-fun-pink md:w-8 md:h-8" />}
                      </div>
                      <div className="space-y-0.5 md:space-y-1 min-w-0">
                        <h4 className="text-sm md:text-xl font-black italic tracking-tighter uppercase leading-none truncate">
                          {feedback.timedOut ? 'TIME_EXPIRED' : (feedback.correct ? 'INTEGRITY_SUCCESS' : 'PROTOCOL_FAILURE')}
                        </h4>
                        <p className="text-[8px] md:text-xs font-bold opacity-80 leading-tight line-clamp-2 md:line-clamp-none">
                          {feedback.timedOut ? "No response... " : ""}
                          {feedback.explanation}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-6 shrink-0">
                      {feedback.scoreGained !== undefined && (
                        <div className="text-sm md:text-2xl font-black italic">+{feedback.scoreGained}</div>
                      )}
                      {hostId === playerId ? (
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleNextScenario} 
                          className={`win-button py-1.5 px-4 md:py-2 md:px-8 flex flex-col items-center justify-center ${allAnswered ? 'bg-white text-fun-dark' : 'bg-fun-yellow text-fun-dark'}`}
                        >
                          <span className="font-black text-[10px] md:text-base">{allAnswered ? "CONTINUE" : "SKIP"}</span>
                        </motion.button>
                      ) : (
                        <div className="text-[7px] md:text-[10px] font-black uppercase text-center w-20 md:w-32 opacity-60 italic">Awaiting...</div>
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
              className="flex flex-col items-center justify-center min-h-full p-4 overflow-y-auto pt-20 lg:pt-0"
            >
              <WinWindow title="Operational Report" onClose={handleReturnToRoom} width="min(600px, 95vw)">
                <div className="space-y-6 text-center">
                  <div className="p-6 bg-fun-cyan rounded-2xl border-4 border-fun-dark shadow-[8px_8px_0_0_#252A34] -rotate-1">
                    <Trophy size={48} className="mx-auto mb-2 text-fun-yellow drop-shadow-[0_4px_0_#252A34]" />
                    <h2 className="text-3xl font-black tracking-tighter italic">FIN_MISSION</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Session Summarized</p>
                  </div>

                  {/* Podium Section */}
                  <div className="flex items-end justify-center gap-1 md:gap-2 h-32 md:h-48 mt-2 md:mt-4">
                    {/* 2nd Place */}
                    {sortedPlayers.length >= 2 && (
                      <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col items-center gap-1 md:gap-2 w-20 md:w-24"
                      >
                        <div className="text-[8px] md:text-[10px] font-black truncate w-full">{sortedPlayers[1].callsign}</div>
                        <div className="win-inset bg-fun-pink/20 border-fun-pink w-full h-16 md:h-24 flex flex-col items-center justify-center gap-0.5 md:gap-1 border-b-0 rounded-t-xl overflow-hidden relative">
                           <span className="text-xl md:text-2xl">🥈</span>
                           <span className="text-[8px] md:text-[10px] font-black">{sortedPlayers[1].score}</span>
                           <div className="absolute inset-0 bg-fun-pink/10 animate-pulse pointer-events-none" />
                        </div>
                      </motion.div>
                    )}

                    {/* 1st Place */}
                    {sortedPlayers.length >= 1 && (
                      <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col items-center gap-1 md:gap-2 w-24 md:w-32"
                      >
                        <div className="text-[9px] md:text-xs font-black truncate w-full text-fun-pink">{sortedPlayers[0].callsign}</div>
                        <div className="win-inset bg-fun-yellow/40 border-fun-yellow w-full h-24 md:h-36 flex flex-col items-center justify-center gap-1 md:gap-2 border-b-0 rounded-t-2xl overflow-hidden relative shadow-[0_0_20px_rgba(255,204,0,0.3)]">
                           <Trophy size={20} className="text-fun-yellow md:w-8 md:h-8" />
                           <span className="text-sm md:text-lg font-black">{sortedPlayers[0].score}</span>
                           <div className="absolute top-0 left-0 w-full h-1 bg-white/40" />
                        </div>
                      </motion.div>
                    )}

                    {/* 3rd Place */}
                    {sortedPlayers.length >= 3 && (
                      <motion.div 
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="flex flex-col items-center gap-1 md:gap-2 w-20 md:w-24"
                      >
                        <div className="text-[8px] md:text-[10px] font-black truncate w-full">{sortedPlayers[2].callsign}</div>
                        <div className="win-inset bg-fun-cyan/20 border-fun-cyan w-full h-12 md:h-20 flex flex-col items-center justify-center gap-0.5 md:gap-1 border-b-0 rounded-t-xl overflow-hidden relative">
                           <span className="text-lg md:text-xl">🥉</span>
                           <span className="text-[8px] md:text-[10px] font-black">{sortedPlayers[2].score}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="win-inset p-4 bg-white space-y-3 shadow-[4px_4px_0_0_#252A34] max-h-[300px] overflow-y-auto">
                    <h3 className="text-[10px] font-black uppercase tracking-widest border-b-2 border-fun-dark pb-1 text-left opacity-40">Full Debrief</h3>
                    <div className="space-y-1.5">
                      {sortedPlayers.map((p, i) => (
                        <motion.div 
                          key={p.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1 + i * 0.05 }}
                          className={`flex items-center justify-between p-2 rounded-lg border-2 border-fun-dark/20 ${i === 0 ? 'bg-fun-yellow/10' : i === 1 ? 'bg-fun-pink/5' : ''}`}
                        >
                          <span className="font-black text-xs flex items-center gap-2">
                            <span className="w-4 text-fun-dark/30">{i+1}</span>
                            <span className="truncate max-w-[120px]">{p.callsign}</span>
                            {p.id === playerId && <span className="text-[8px] bg-fun-dark text-white px-1 rounded">YOU</span>}
                          </span>
                          <span className="text-xs font-black">{p.score} <span className="text-[8px] opacity-40">PTS</span></span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReturnToRoom} 
                      className="win-button flex-1 py-3 bg-fun-cyan text-sm flex items-center justify-center gap-2"
                    >
                      <Users size={16} /> GO TO LOBBY
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReturnToMenu} 
                      className="win-button py-3 px-6 bg-fun-dark text-white text-[10px]"
                    >
                      EXIT TO BASE
                    </motion.button>
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
      <footer className="h-16 px-2 md:px-4 pb-4 md:pb-4 relative z-50 shrink-0 mt-auto">
        <div className="h-full bg-fun-dark/95 backdrop-blur-xl border-3 border-fun-dark rounded-2xl md:rounded-3xl p-1.5 md:p-2 flex gap-2 md:gap-3 shadow-[4px_4px_0_0_rgba(0,0,0,0.4)] md:shadow-[8px_8px_0_0_rgba(0,0,0,0.4)]">
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              handleReturnToMenu();
              playSfx('click');
            }}
            className="win-button bg-fun-pink text-white px-3 md:px-6 flex items-center gap-2 md:gap-3 font-black shadow-none border-0 shrink-0"
          >
            <div className="w-2 h-2 md:w-3 md:h-3 md:w-4 md:h-4 bg-fun-yellow rounded-full animate-ping" /> 
            <span className="tracking-tighter text-[10px] md:text-sm">START</span>
          </motion.button>
          
          <div className="flex-1 flex gap-1 md:gap-2 px-1 md:px-4 border-l-2 md:border-l-3 border-white/10 overflow-x-auto overflow-y-hidden no-scrollbar items-center min-w-0 h-full">
             <motion.div 
               whileHover={{ y: -2 }}
               className={`h-8 px-2 md:h-10 md:px-6 flex items-center gap-1.5 md:gap-3 rounded-xl md:rounded-2xl border-2 md:border-3 border-fun-dark shadow-[2px_2px_0_0_rgba(0,0,0,1)] md:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all shrink-0 ${view === 'GAME' ? 'bg-fun-yellow' : 'bg-white opacity-80'}`}
             >
                <Mail size={14} className="text-fun-dark md:w-4 md:h-4" /> 
                <span className="text-[8px] md:text-xs font-black uppercase tracking-tight hidden sm:inline">Mail_Hub.ipa</span>
             </motion.div>

             {roomId && (
               <motion.div 
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 whileHover={{ y: -2 }}
                 onClick={() => {
                    navigator.clipboard.writeText(roomId);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    playSfx('click');
                 }}
                 className="h-8 px-2 md:h-10 md:px-4 flex items-center gap-1.5 md:gap-3 bg-fun-cyan rounded-xl md:rounded-2xl border-2 md:border-3 border-fun-dark shadow-[2px_2px_0_0_rgba(0,0,0,1)] md:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all shrink-0 cursor-pointer group"
               >
                 <Terminal size={12} className="text-fun-dark md:w-3.5 md:h-3.5" />
                 <span className="text-[8px] md:text-[10px] font-black tracking-widest truncate max-w-[50px] md:max-w-none uppercase">
                   {copied ? 'COPIED!' : roomId.split('-')[0]}
                 </span>
               </motion.div>
             )}
          </div>

          <div className="hidden md:flex items-center gap-6 text-[11px] font-black uppercase text-white px-6 shrink-0">
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
