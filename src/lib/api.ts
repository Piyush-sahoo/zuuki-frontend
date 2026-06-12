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
  created_at: string;
}

export interface AddWebsiteInput {
  url: string;
  name?: string;
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
};

export { ApiError };
