import { ChevronRight, ScanSearch } from "lucide-react";
import { api } from "../api";
import { useSession } from "../state/session";
import { useAsync } from "../lib/useAsync";
import { displayValue, humanize, isPlainObject } from "../lib/format";
import { Drawer } from "./Drawer";
import { ErrorNotice, KeyValueGrid, LoadingBlock } from "./common";
import { JsonView, RawJson } from "./JsonView";

// Sections that best explain an answer are opened first.
const PRIORITY = ["intent", "classification", "route", "routes", "steps", "nodes", "retrieval", "retrieved", "tools_invoked", "tools", "eligibility", "critic", "citations", "response"];

function sortKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ia = PRIORITY.indexOf(a);
    const ib = PRIORITY.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

function summarise(v: unknown): string {
  if (Array.isArray(v)) return `${v.length}`;
  if (isPlainObject(v)) return `${Object.keys(v).length} fields`;
  return "";
}

export function AuditDrawer({ traceId, onClose }: { traceId: string; onClose: () => void }) {
  const { t, citizenId } = useSession();
  const { data, error, loading, reload } = useAsync(() => api.audit(citizenId, traceId), [traceId, citizenId]);

  const entries = data && isPlainObject(data) ? Object.entries(data) : [];
  const scalars = entries.filter(([, v]) => !isPlainObject(v) && !Array.isArray(v));
  const complex = entries.filter(([, v]) => isPlainObject(v) || Array.isArray(v));
  const ordered = sortKeys(complex.map(([k]) => k));

  return (
    <Drawer
      open
      onClose={onClose}
      wide
      icon={<ScanSearch size={20} aria-hidden="true" />}
      title={t("auditTitle")}
      subtitle={
        <span>
          {t("traceId")} <span className="mono">{traceId}</span>
        </span>
      }
    >
      <p className="muted">{t("auditIntro")}</p>
      {loading && !data && <LoadingBlock />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && (
        <>
          {scalars.length > 0 && (
            <section className="audit-section">
              <h3>{t("overview")}</h3>
              <KeyValueGrid items={scalars.map(([k, v]) => [humanize(k), displayValue(v)])} />
            </section>
          )}
          {ordered.map((k, i) => {
            const v = data[k];
            const empty = (Array.isArray(v) && !v.length) || (isPlainObject(v) && !Object.keys(v).length);
            return (
              <details className="audit-details" key={k} open={i < 3 && !empty}>
                <summary>
                  <ChevronRight size={16} className="chev" aria-hidden="true" />
                  <span>{humanize(k)}</span>
                  <span className="muted small">{summarise(v)}</span>
                </summary>
                <div className="audit-body">
                  <JsonView value={v} openDepth={2} />
                </div>
              </details>
            );
          })}
          <RawJson value={data} label={t("rawJson")} />
        </>
      )}
    </Drawer>
  );
}
