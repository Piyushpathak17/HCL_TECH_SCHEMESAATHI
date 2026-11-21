import { FileText, LockKeyhole, LockKeyholeOpen, UserCheck, Wrench } from "lucide-react";
import { api } from "../api";
import { useSession } from "../state/session";
import { useUI } from "../state/ui";
import { useAsync } from "../lib/useAsync";
import { formatDateTime, humanize, isPlainObject } from "../lib/format";
import { Drawer } from "./Drawer";
import { ErrorNotice, KeyValueGrid, LoadingBlock } from "./common";
import { JsonView, RawJson } from "./JsonView";
import { priorityTone } from "./ReferralCard";

function EvidenceItem({ item }: { item: unknown }) {
  const { openSource } = useUI();
  if (!isPlainObject(item)) return <JsonView value={item} />;
  if (typeof item.source_id === "string") {
    const section = typeof item.section === "string" ? item.section : undefined;
    return (
      <button type="button" className="citation-chip" onClick={() => openSource(item.source_id as string, section)}>
        <FileText size={14} aria-hidden="true" />
        <span>
          {item.source_id}
          {section ? ` · ${section}` : ""}
        </span>
      </button>
    );
  }
  if (typeof item.tool === "string") {
    return (
      <div className="evidence-tool">
        <div className="evidence-tool-name">
          <Wrench size={14} aria-hidden="true" /> <span className="mono">{item.tool}</span>
        </div>
        {"output" in item && <JsonView value={item.output} openDepth={1} />}
      </div>
    );
  }
  return <JsonView value={item} />;
}

export function ReferralDrawer({ referralId, onClose }: { referralId: string; onClose: () => void }) {
  const { t, citizenId, state } = useSession();
  const { data, error, loading, reload } = useAsync(() => api.referral(citizenId, referralId), [referralId, citizenId]);
  const uiLang = state.language === "auto" ? "en" : state.language;
  const b = data?.bundle ?? {};
  const known = new Set([
    "queue",
    "priority",
    "referral_reasons",
    "citizen_summary",
    "evidence",
    "attempted_answer",
    "unresolved_questions",
    "pii_redacted",
    "intent",
    "urgency",
    "sentiment",
  ]);
  const extra = Object.entries(b).filter(([k]) => !known.has(k));
  const reasons = Array.isArray(b.referral_reasons) ? b.referral_reasons : [];
  const evidence = Array.isArray(b.evidence) ? b.evidence : [];
  const unresolved = Array.isArray(b.unresolved_questions) ? b.unresolved_questions : [];

  return (
    <Drawer
      open
      onClose={onClose}
      wide
      icon={<UserCheck size={20} aria-hidden="true" />}
      title={t("bundleTitle")}
      subtitle={<span className="mono">{referralId}</span>}
    >
      {loading && !data && <LoadingBlock />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && (
        <div className="bundle">
          <div className="bundle-top">
            <span className={`pii-flag ${b.pii_redacted ? "pii-flag--ok" : "pii-flag--warn"}`}>
              {b.pii_redacted ? <LockKeyhole size={15} aria-hidden="true" /> : <LockKeyholeOpen size={15} aria-hidden="true" />}
              {b.pii_redacted ? t("piiRedacted") : t("piiNotRedacted")}
            </span>
            {(data.priority || b.priority) && (
              <span className={`chip chip--sm chip--${priorityTone(data.priority || b.priority)}`}>
                {t("priority")}: {humanize(data.priority || b.priority)}
              </span>
            )}
          </div>
          <KeyValueGrid
            items={[
              [t("queue"), humanize(data.queue || b.queue)],
              [t("createdAt"), formatDateTime(data.created_at, uiLang)],
              [t("conversationLabel"), data.conversation_id ? <span className="mono">{data.conversation_id}</span> : ""],
              [t("intentLabel"), humanize(b.intent)],
              [t("urgencyLabel"), humanize(b.urgency)],
              [t("sentimentLabel"), humanize(b.sentiment)],
            ]}
          />

          {reasons.length > 0 && (
            <section className="bundle-section">
              <h3>{t("reasons")}</h3>
              <div className="chip-row">
                {reasons.map((r) => (
                  <span key={String(r)} className="chip chip--violet chip--sm">
                    {humanize(String(r))}
                  </span>
                ))}
              </div>
            </section>
          )}

          {b.citizen_summary && (
            <section className="bundle-section">
              <h3>{t("summary")}</h3>
              <p dir="auto">{String(b.citizen_summary)}</p>
            </section>
          )}

          {b.attempted_answer && (
            <section className="bundle-section">
              <h3>{t("attemptedAnswer")}</h3>
              <blockquote dir="auto">{String(b.attempted_answer)}</blockquote>
            </section>
          )}

          {evidence.length > 0 && (
            <section className="bundle-section">
              <h3>{t("evidence")}</h3>
              <ul className="evidence-list">
                {evidence.map((e, i) => (
                  <li key={i}>
                    <EvidenceItem item={e} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {unresolved.length > 0 && (
            <section className="bundle-section">
              <h3>{t("unresolved")}</h3>
              <ul className="plain-list">
                {unresolved.map((q, i) => (
                  <li key={i} dir="auto">
                    {String(q)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {extra.length > 0 && (
            <section className="bundle-section">
              <JsonView value={Object.fromEntries(extra)} openDepth={1} />
            </section>
          )}

          <RawJson value={data} label={t("rawJson")} />
        </div>
      )}
    </Drawer>
  );
}
