export interface Player {
  id: string;
  callsign: string;
  score: number;
}

export interface Scenario {
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

export interface Feedback {
  correct: boolean;
  explanation: string;
  red_flags: string[];
  scoreGained?: number;
}

export type View = "MAIN_MENU" | "LOBBY" | "GAME" | "RESULTS" | "SETTINGS";
