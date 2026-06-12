import { create } from "zustand";

export interface NotionConfig {
  token: string;
  databaseId: string;
}

export interface JobStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  step: string;
  message: string;
  progress: number;
  resultUrl?: string;
  error?: string;
}

export interface HistoryItem {
  jobId: string;
  title: string;
  url: string;
  notionUrl: string;
  processedAt: string;
}

interface AppState {
  notionConfig: NotionConfig;
  isSettingsOpen: boolean;
  currentJob: JobStatus | null;
  history: HistoryItem[];

  setNotionConfig: (config: NotionConfig) => void;
  setSettingsOpen: (open: boolean) => void;
  setCurrentJob: (job: JobStatus | null) => void;
  addHistory: (item: HistoryItem) => void;
  clearCurrentJob: () => void;
}

const STORAGE_KEY = "yta_notion_config";

function loadConfig(): NotionConfig {
  if (typeof window === "undefined") return { token: "", databaseId: "" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { token: "", databaseId: "" };
  } catch {
    return { token: "", databaseId: "" };
  }
}

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("yta_history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  notionConfig: loadConfig(),
  isSettingsOpen: false,
  currentJob: null,
  history: loadHistory(),

  setNotionConfig: (config) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    set({ notionConfig: config });
  },

  setSettingsOpen: (open) => set({ isSettingsOpen: open }),

  setCurrentJob: (job) => set({ currentJob: job }),

  addHistory: (item) => {
    const history = [item, ...get().history].slice(0, 50);
    localStorage.setItem("yta_history", JSON.stringify(history));
    set({ history });
  },

  clearCurrentJob: () => set({ currentJob: null }),
}));
