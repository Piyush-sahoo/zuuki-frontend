// Typed client for the Zukii Voice Agent Platform backend.
// Mirrors app/routes/websites.py on the FastAPI side.

export type WebsiteStatus = "pending" | "completed" | "failed";

export interface Website {
  id: string;
  url: string;
  name?: string | null;
  status: WebsiteStatus;
  vapi_agent_id?: string | null;
  embed_code?: string | null;
  bolna_agent_id?: string | null;
  rag_id?: string | null;
  inbound_number?: string | null;
  provider?: string | null;
  created_at: string;
}

export interface AddWebsiteInput {
  url: string;
  name?: string;
  role?: string;
  tone?: string;
  language?: string;
  voice?: string;
  instructions?: string;
  greeting?: string;
}

export interface VoiceOptions {
  voices: { id: string; label: string }[];
  languages: { code: string; label: string }[];
  tones: string[];
  roles: string[];
}

export interface Draft {
  draft_id: string;
  url: string;
  name: string;
  status: "crawling" | "ready" | "failed";
  prompt: string | null;
  knowledge_preview?: string;
  pages?: number | null;
  rag_id?: string | null;
  crawl_done?: number;
  crawl_total?: number;
  crawl_status?: string | null;
}

export interface PhoneNumber {
  id: string;
  phone_number: string;
  provider: string;
}

export interface DraftInput {
  url: string;
  name?: string;
  role?: string;
  tone?: string;
  language?: string;
  voice?: string;
}

export interface BuildInput {
  prompt: string;
  voice?: string;
  language?: string;
  greeting?: string;
  tools?: string[];
  transfer_number?: string;
  phone_number_id?: string;
  phone_number?: string;
}

export type LeadScore = "hot" | "warm" | "cold";

export interface Lead {
  call_id: string;
  website_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  intent?: string | null;
  interestedIn?: string | null;
  leadScore?: LeadScore | null;
  sentiment?: string | null;
  wantsCallback?: boolean | null;
  summary?: string | null;
  type?: string | null;
  callbackPlaced?: boolean | null;
  created_at?: string | null;
}

export interface Analytics {
  totals: {
    calls: number;
    web: number;
    phone: number;
    leads: number;
    hotLeads: number;
    avgDurationSec: number;
    totalCost: number;
    callbacks: number;
  };
  overTime: { date: string; count: number }[];
  perAgent: { name: string; calls: number; leads: number }[];
  topGaps: { question: string; count: number }[];
  sentiment: Record<string, number>;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000/api";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Cannot reach the backend. Is it running on :8000?");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listWebsites: () => request<Website[]>("/websites"),
  getWebsite: (id: string) => request<Website>(`/websites/${id}`),
  addWebsite: (input: AddWebsiteInput) =>
    request<Website>("/websites", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteWebsite: (id: string) =>
    request<void>(`/websites/${id}`, { method: "DELETE" }),
  getAnalytics: () => request<Analytics>("/analytics"),
  getLeads: () => request<Lead[]>("/leads"),
  getVoiceOptions: () => request<VoiceOptions>("/voice-options"),
  getPhoneNumbers: () => request<PhoneNumber[]>("/phone-numbers"),
  createDraft: (input: DraftInput) =>
    request<{ draft_id: string; status: string }>("/agents/draft", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getDraft: (id: string) => request<Draft>(`/agents/draft/${id}`),
  buildAgent: (id: string, input: BuildInput) =>
    request<Website>(`/agents/draft/${id}/build`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  callMe: (id: string, number: string) =>
    request<{ status: string; number: string; call_id: string }>(
      `/agents/${id}/call`,
      { method: "POST", body: JSON.stringify({ number }) },
    ),
};

export interface VoiceTurn {
  transcript: string;
  reply: string;
  audio: string | null; // base64 mp3
}

/** Browser voice loop: send a recorded clip, get back the agent's spoken reply. */
export async function voiceTurn(
  websiteId: string,
  audio: Blob,
  history: { role: string; content: string }[],
): Promise<VoiceTurn> {
  const fd = new FormData();
  fd.append("website_id", websiteId);
  fd.append("history", JSON.stringify(history));
  fd.append("audio", audio, "clip.webm");
  const res = await fetch(`${API_BASE}/voice/turn`, { method: "POST", body: fd });
  if (!res.ok) throw new ApiError(res.status, "Voice turn failed");
  return (await res.json()) as VoiceTurn;
}

export { ApiError };
