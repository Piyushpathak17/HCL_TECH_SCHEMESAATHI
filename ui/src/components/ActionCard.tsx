import { useEffect, useState } from "react";
import {
  BellRing,
  CalendarCheck,
  CalendarX,
  CircleCheck,
  CircleX,
  FilePenLine,
  Info,
  ShieldCheck,
  Timer,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ActionType, PendingAction } from "../types";
import { useT } from "../state/session";
import { useChat } from "../state/chat";
import type { ActionState } from "../state/session";
import { attrLabel } from "../lib/attributes";
import { displayValue, humanize, isPlainObject } from "../lib/format";
import { KeyValueGrid, Spinner } from "./common";
import { JsonView } from "./JsonView";

const ACTION_ICONS: Record<ActionType, LucideIcon> = {
  book_appointment: CalendarCheck,
  cancel_appointment: CalendarX,
  set_reminder: BellRing,
  draft_application: FilePenLine,
};

function useCountdown(expiresAt: string | undefined, active: boolean): number | null {
  const target = expiresAt ? Date.parse(expiresAt) : NaN;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active || Number.isNaN(target)) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active, target]);
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.floor((target - now) / 1000));
}

function formatRemaining(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

/** Scalar payload fields as label/value rows; nested values rendered compactly. */
function PayloadDetails({ payload }: { payload: Record<string, unknown> }) {
  const t = useT();
  const entries = Object.entries(payload ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!entries.length) return null;
  return (
    <KeyValueGrid
      items={entries.slice(0, 12).map(([k, v]) => [
        attrLabel(t, k),
        isPlainObject(v) || (Array.isArray(v) && v.some((x) => typeof x === "object")) ? (
          <JsonView value={v} openDepth={0} />
        ) : (
          displayValue(v)
        ),
      ])}
    />
  );
}

interface Props {
  messageId: string;
  action: PendingAction;
  state: ActionState;
  lang?: string;
}

export function ActionCard({ messageId, action, state, lang }: Props) {
  const t = useT();
  const { confirmAction, cancelAction } = useChat();
  const phase = state.phase;
  const live = phase === "pending" || phase === "confirming" || phase === "cancelling";
  const remaining = useCountdown(action.expires_at, live);
  const expired = (live && remaining === 0) || state.errorKind === "expired";
  const Icon = ACTION_ICONS[action.action_type] ?? CalendarCheck;
  const tierText = action.tier === 1 ? t("tier1") : action.tier === 2 ? t("tier2") : t("tierOther");
  const busy = phase === "confirming" || phase === "cancelling";

  // ---- terminal states
  if (phase === "executed") {
    const verified = state.verified !== false;
    return (
      <section className={`action-card action-card--done ${verified ? "" : "action-card--unverified"}`}>
        <div className="action-done-head">
          {verified ? <ShieldCheck size={22} aria-hidden="true" /> : <TriangleAlert size={22} aria-hidden="true" />}
          <strong>{verified ? t("doneVerified") : t("doneUnverified")}</strong>
        </div>
        <p className="action-summary" lang={lang}>
          {action.summary}
        </p>
        {state.result && Object.keys(state.result).length > 0 && (
          <div className="action-result">
            <div className="small muted">{t("result")}</div>
            <JsonView value={state.result} openDepth={1} />
          </div>
        )}
      </section>
    );
  }
  if (phase === "cancelled") {
    return (
      <section className="action-card action-card--muted">
        <div className="action-done-head">
          <CircleX size={20} aria-hidden="true" />
          <strong>{t("cancelledState")}</strong>
        </div>
        <p className="action-summary muted" lang={lang}>
          {action.summary}
        </p>
      </section>
    );
  }

  const terminalError =
    phase === "error"
      ? state.errorKind === "already"
        ? t("alreadyHandled")
        : state.errorKind === "notfound"
          ? t("notFoundAction")
          : state.errorKind === "expired"
            ? t("expired")
            : state.error
      : null;

  return (
    <section className={`action-card ${expired || phase === "error" ? "action-card--muted" : ""}`} aria-live="polite">
      <header className="action-head">
        <span className="action-icon">
          <Icon size={22} aria-hidden="true" />
        </span>
        <div className="action-titles">
          <div className="small muted">{t("proposedAction")}</div>
          <h3>{t(`act_${action.action_type}` as const)}</h3>
        </div>
        <span className="tier-tag" title={tierText}>
          {t("tierLabel", { n: action.tier })}
        </span>
      </header>

      <p className="action-summary" lang={lang}>
        {action.summary}
      </p>

      <PayloadDetails payload={action.payload} />

      {action.reminder && (
        <p className="action-reminder" lang={lang}>
          <BellRing size={16} aria-hidden="true" />
          <span>
            <span className="muted">{t("reminderLabel")}:</span> {action.reminder}
          </span>
        </p>
      )}

      {action.missing_fields?.length > 0 && (
        <div className="missing-fields">
          <span className="small">{t("missingFields", { list: "" }).replace(/[:：]\s*$/, "")}:</span>
          {action.missing_fields.map((f) => (
            <span key={f} className="chip chip--amber chip--sm">
              {attrLabel(t, f) || humanize(f)}
            </span>
          ))}
        </div>
      )}

      <p className="action-tier-note small muted">{tierText}</p>

      {terminalError ? (
        <p className="action-status action-status--info">
          <Info size={16} aria-hidden="true" /> {terminalError}
        </p>
      ) : expired ? (
        <p className="action-status action-status--warn">
          <Timer size={16} aria-hidden="true" /> {t("expired")}
        </p>
      ) : (
        <>
          <p className="nothing-done">
            <Info size={16} aria-hidden="true" />
            {t("nothingDoneYet")}
          </p>
          {state.error && (
            <p className="action-status action-status--error" role="alert">
              <TriangleAlert size={16} aria-hidden="true" />
              {state.errorKind === "forbidden" ? t("forbiddenAction") : state.error}
            </p>
          )}
          <div className="action-buttons">
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => confirmAction(messageId)}
            >
              {phase === "confirming" ? (
                <Spinner label={t("confirming")} />
              ) : (
                <>
                  <CircleCheck size={18} aria-hidden="true" /> {t("confirm")}
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={busy}
              onClick={() => cancelAction(messageId)}
            >
              {phase === "cancelling" ? <Spinner label={t("cancelling")} /> : t("cancel")}
            </button>
            {remaining !== null && (
              <span className={`countdown ${remaining < 120 ? "countdown--low" : ""}`}>
                <Timer size={15} aria-hidden="true" />
                {t("expiresIn", { time: formatRemaining(remaining) })}
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
