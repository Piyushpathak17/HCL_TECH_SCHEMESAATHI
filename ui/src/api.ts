// Typed client for the SchemeSathi API. Every request carries X-Citizen-Id; errors from
// FastAPI ({"detail": "..."}) are turned into ApiError with the HTTP status kept.
import type {
  AdminLoadResponse,
  AskRequest,
  AskResponse,
  AuditRecord,
  CancelResponse,
  ConfirmResponse,
  Conversation,
  DemoCitizen,
  EligibilityRequest,
  EligibilityResponse,
  HealthResponse,
  IngestMetadata,
  IngestResponse,
  ReferralRecord,
  Scheme,
  SourceDetail,
  SourceRow,
} from "./types";

export const API_BASE: string = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail || `Request failed (${status})`);
    this.status = status;
    this.detail = detail;
  }
  /** True when the server could not be reached at all. */
  get isNetwork(): boolean {
    return this.status === 0;
  }
}

function detailToString(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{loc, msg, type}]
    return detail
      .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : JSON.stringify(d)))
      .join("; ");
  }
  if (detail == null) return "";
  return JSON.stringify(detail);
}

interface RequestOptions {
  method?: "GET" | "POST";
  citizenId: string;
  json?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    "X-Citizen-Id": opts.citizenId || "guest",
    Accept: "application/json",
  };
  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.form) {
    body = opts.form; // browser sets the multipart boundary
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? (body ? "POST" : "GET"),
      headers,
      body,
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "Could not reach the SchemeSathi server.");
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in (data as Record<string, unknown>)
        ? detailToString((data as Record<string, unknown>).detail)
        : typeof data === "string"
          ? data.slice(0, 300)
          : res.statusText;
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

const enc = encodeURIComponent;

export const api = {
  ask: (citizenId: string, body: AskRequest, signal?: AbortSignal) =>
    request<AskResponse>("/ask", { citizenId, json: { channel: "web", ...body }, signal }),

  confirmAction: (citizenId: string, actionId: string) =>
    request<ConfirmResponse>(`/actions/${enc(actionId)}/confirm`, { citizenId, method: "POST", json: {} }),

  cancelAction: (citizenId: string, actionId: string) =>
    request<CancelResponse>(`/actions/${enc(actionId)}/cancel`, { citizenId, method: "POST", json: {} }),

  eligibility: (citizenId: string, body: EligibilityRequest) =>
    request<EligibilityResponse>("/eligibility", { citizenId, json: body }),

  schemes: (citizenId: string, asOfDate?: string) =>
    request<Scheme[]>(`/schemes${asOfDate ? `?as_of_date=${enc(asOfDate)}` : ""}`, { citizenId }),

  sources: (citizenId: string) => request<SourceRow[]>("/sources", { citizenId }),

  source: (citizenId: string, sourceId: string) => request<SourceDetail>(`/sources/${enc(sourceId)}`, { citizenId }),

  referral: (citizenId: string, referralId: string) =>
    request<ReferralRecord>(`/referrals/${enc(referralId)}`, { citizenId }),

  audit: (citizenId: string, traceId: string) => request<AuditRecord>(`/audit/${enc(traceId)}`, { citizenId }),

  conversation: (citizenId: string, id: string) => request<Conversation>(`/conversations/${enc(id)}`, { citizenId }),

  health: (citizenId: string) => request<HealthResponse>("/health", { citizenId }),

  demoCitizens: (citizenId: string) => request<DemoCitizen[]>("/citizens/demo", { citizenId }),

  ingest: (citizenId: string, file: File, metadata: IngestMetadata) => {
    const form = new FormData();
    form.append("file", file);
    form.append("metadata", JSON.stringify(metadata));
    return request<IngestResponse>("/ingest", { citizenId, form, method: "POST" });
  },

  adminLoad: (citizenId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f, f.name));
    return request<AdminLoadResponse>("/admin/load", { citizenId, form, method: "POST" });
  },
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.detail || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
