// Small shared building blocks.
import type { ReactNode } from "react";
import { CircleAlert, Info, LoaderCircle, RotateCcw, TriangleAlert, CircleCheck } from "lucide-react";
import { useT } from "../state/session";

export function Logo({ size = 32 }: { size?: number }) {
  // A shield-shaped "sathi" mark: two figures side by side under one roof, with a check.
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo-mark">
      <rect width="40" height="40" rx="11" fill="var(--logo-bg)" />
      <path
        d="M20 7.5c-4.6 3-7.9 3.4-10.2 3.4v7.3c0 6.3 4.3 10.4 10.2 12.6 5.9-2.2 10.2-6.3 10.2-12.6v-7.3c-2.3 0-5.6-.4-10.2-3.4z"
        fill="var(--logo-shield)"
      />
      <path
        d="M14.2 20.4l4 3.9 7.7-8.6"
        fill="none"
        stroke="var(--logo-check)"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      Scheme<span className="wordmark-accent">Sathi</span>
    </span>
  );
}

export function Spinner({ label, size = 18 }: { label?: string; size?: number }) {
  return (
    <span className="spinner" role="status">
      <LoaderCircle size={size} className="spin" aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  );
}

export function LoadingBlock({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="loading-block">
      <Spinner label={label ?? t("loading")} />
    </div>
  );
}

type Tone = "info" | "warn" | "error" | "ok";
const TONE_ICON = { info: Info, warn: TriangleAlert, error: CircleAlert, ok: CircleCheck };

export function Notice({ tone = "info", children, action }: { tone?: Tone; children: ReactNode; action?: ReactNode }) {
  const Icon = TONE_ICON[tone];
  return (
    <div className={`notice notice--${tone}`} role={tone === "error" ? "alert" : undefined}>
      <Icon size={18} aria-hidden="true" className="notice-icon" />
      <div className="notice-body">{children}</div>
      {action && <div className="notice-action">{action}</div>}
    </div>
  );
}

export function ErrorNotice({ error, onRetry }: { error: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <Notice
      tone="error"
      action={
        onRetry && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            <RotateCcw size={16} aria-hidden="true" /> {t("retry")}
          </button>
        )
      }
    >
      <strong>{t("couldNotLoad")}</strong> <span className="muted">{error}</span>
    </Notice>
  );
}

export function KeyValueGrid({ items }: { items: [string, ReactNode][] }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!shown.length) return null;
  return (
    <dl className="kv">
      {shown.map(([k, v]) => (
        <div className="kv-row" key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PageHeader({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {intro && <p className="page-intro">{intro}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
