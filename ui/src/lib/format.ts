import type { ReplyLang } from "../types";

const LOCALES: Record<ReplyLang, string> = { en: "en-IN", hi: "hi-IN", kn: "kn-IN", ta: "ta-IN" };

export function localeFor(lang: string | undefined): string {
  return LOCALES[(lang as ReplyLang) ?? "en"] ?? "en-IN";
}

/** Today's date in the browser's local time zone as YYYY-MM-DD. */
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "2026-11-30" -> "30 Nov 2026" (in the chosen locale). Falls back to the raw string. */
export function formatDate(value: string | null | undefined, lang?: string): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return value;
  try {
    return d.toLocaleDateString(localeFor(lang), { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return value;
  }
}

export function formatDateTime(value: string | null | undefined, lang?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  try {
    return d.toLocaleString(localeFor(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  } catch {
    return value;
  }
}

export function formatTime(d: Date, lang?: string): string {
  try {
    return d.toLocaleTimeString(localeFor(lang), { hour: "numeric", minute: "2-digit" });
  } catch {
    return d.toISOString().slice(11, 16);
  }
}

/** Indian digit grouping for rupee amounts: 120000 -> "1,20,000". */
export function formatINR(n: number): string {
  try {
    return new Intl.NumberFormat("en-IN").format(n);
  } catch {
    return String(n);
  }
}

/** snake_case or kebab -> "Sentence case". */
export function humanize(s: string | null | undefined): string {
  if (!s) return "";
  const t = s.replace(/[_-]+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Render any value from the API as short readable text. */
export function displayValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return Number.isInteger(v) && Math.abs(v) >= 10000 ? formatINR(v) : String(v);
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(displayValue).join(", ");
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function uid(prefix = "m"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Pick the localised value from a scheme-like object: name_hi / benefit_summary_kn ... */
export function pickLocalized(obj: Record<string, unknown>, base: string, lang: string): string {
  const key = lang === "en" ? base : `${base}_${lang}`;
  const v = obj[key];
  if (typeof v === "string" && v.trim()) return v;
  const fallback = obj[base] ?? obj[`${base}_en`];
  return typeof fallback === "string" ? fallback : "";
}
