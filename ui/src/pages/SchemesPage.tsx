import { useId, useMemo, useState } from "react";
import {
  Accessibility,
  CalendarClock,
  ChevronDown,
  FileText,
  GraduationCap,
  HandCoins,
  House,
  Info,
  Landmark,
  MessagesSquare,
  Search,
  ShieldPlus,
  Sprout,
  Tractor,
  type LucideIcon,
} from "lucide-react";
import { api } from "../api";
import type { Scheme } from "../types";
import { useSession } from "../state/session";
import { useUI } from "../state/ui";
import { useAsync } from "../lib/useAsync";
import { formatDate, humanize, pickLocalized, todayISO } from "../lib/format";
import { StatusChip } from "../components/Badges";
import { ErrorNotice, LoadingBlock, PageHeader } from "../components/common";

function benefitIcon(type: string): LucideIcon {
  const t = type.toLowerCase();
  if (t.includes("pension")) return HandCoins;
  if (t.includes("scholar") || t.includes("educat")) return GraduationCap;
  if (t.includes("equipment") || t.includes("machin") || t.includes("subsid")) return Tractor;
  if (t.includes("farm") || t.includes("agri")) return Sprout;
  if (t.includes("hous") || t.includes("rent")) return House;
  if (t.includes("disab")) return Accessibility;
  if (t.includes("insur")) return ShieldPlus;
  return Landmark;
}

function SchemeCard({ scheme, lang }: { scheme: Scheme; lang: string }) {
  const { t } = useSession();
  const { prefillAsk, openSource } = useUI();
  const [open, setOpen] = useState(false);
  const docsId = useId();
  const rec = scheme as unknown as Record<string, unknown>;
  const name = pickLocalized(rec, "name", lang) || scheme.name_en;
  const summary = pickLocalized(rec, "benefit_summary", lang) || scheme.benefit_summary;
  const Icon = benefitIcon(scheme.benefit_type || "");
  const docs = scheme.documents ?? [];
  const mandatory = docs.filter((d) => String(d.mandatory).toUpperCase() === "Y");
  const optional = docs.filter((d) => String(d.mandatory).toUpperCase() !== "Y");

  let dateLine: string;
  if (scheme.status === "upcoming" && scheme.apply_from) dateLine = t("opensOn", { date: formatDate(scheme.apply_from, lang) });
  else if (scheme.apply_until) dateLine = t("lastDate", { date: formatDate(scheme.apply_until, lang) });
  else dateLine = t("noLastDate");

  return (
    <article className={`scheme-card scheme-card--${scheme.status}`}>
      <div className="scheme-top">
        <span className="benefit-tag">
          <Icon size={16} aria-hidden="true" />
          {humanize(scheme.benefit_type)}
        </span>
        <StatusChip status={scheme.status} />
      </div>
      <h2 className="scheme-name" lang={lang}>
        {name}
      </h2>
      {name !== scheme.name_en && <div className="scheme-english">{scheme.name_en}</div>}
      <p className="scheme-summary" lang={lang}>
        {summary}
      </p>
      <div className="scheme-facts">
        <span>
          <CalendarClock size={15} aria-hidden="true" /> {dateLine}
        </span>
        <span className="muted">
          <Landmark size={15} aria-hidden="true" /> {scheme.department}
        </span>
      </div>
      {scheme.notes?.length > 0 && (
        <ul className="scheme-notes">
          {scheme.notes.map((n) => (
            <li key={n}>
              <Info size={15} aria-hidden="true" /> <span>{n}</span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div id={docsId} className="scheme-docs">
          {[...mandatory, ...optional].map((d) => {
            const req = String(d.mandatory).toUpperCase() === "Y";
            return (
              <div className="doc-row" key={d.document_name}>
                <FileText size={16} aria-hidden="true" className="doc-icon" />
                <div>
                  <div className="doc-name">
                    {d.document_name}{" "}
                    <span className={`chip chip--sm ${req ? "chip--teal" : "chip--slate"}`}>
                      {req ? t("mandatory") : t("optional")}
                    </span>
                  </div>
                  {d.notes && <div className="small muted">{d.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="scheme-actions">
        {docs.length > 0 && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-expanded={open}
            aria-controls={docsId}
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronDown size={16} className={`chev-rot ${open ? "is-open" : ""}`} aria-hidden="true" />
            {open ? t("hideDocuments") : t("documents", { n: docs.length })}
          </button>
        )}
        {scheme.source_id && (
          <button type="button" className="link-btn small mono" onClick={() => openSource(scheme.source_id!)}>
            {scheme.source_id}
          </button>
        )}
        <button
          type="button"
          className="btn btn--secondary btn--sm scheme-ask"
          onClick={() => prefillAsk(t("askTemplate", { name }))}
        >
          <MessagesSquare size={16} aria-hidden="true" /> {t("askAboutScheme")}
        </button>
      </div>
    </article>
  );
}

const STATUS_FILTERS = ["all", "open", "upcoming", "closed"] as const;

export function SchemesPage() {
  const { t, citizenId, state } = useSession();
  const lang = state.language === "auto" ? "en" : state.language;
  const asOf = state.asOfDate ?? undefined;
  const { data, error, loading, reload } = useAsync(() => api.schemes(citizenId, asOf), [citizenId, asOf]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (!q) return true;
      return [s.scheme_id, s.name_en, s.name_hi, s.name_kn, s.name_ta, s.department, s.benefit_type, s.benefit_summary]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, query, status]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.length ?? 0 };
    (data ?? []).forEach((s) => (c[s.status] = (c[s.status] ?? 0) + 1));
    return c;
  }, [data]);

  return (
    <div className="page">
      <PageHeader title={t("schemesTitle")} intro={t("schemesIntro", { date: formatDate(asOf ?? todayISO(), lang) })} />
      <div className="toolbar">
        <label className="search-input">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">{t("searchSchemes")}</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchSchemes")} />
        </label>
        <div className="segmented" role="group" aria-label={t("statusLabel")}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              className={status === s ? "is-active" : ""}
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {s === "all" ? t("filterAll") : t(`status_${s}` as const)}
              <span className="seg-count">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
      {loading && !data && <LoadingBlock />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && filtered.length === 0 && <p className="muted">{t("noSchemes")}</p>}
      <div className="scheme-grid">
        {filtered.map((s) => (
          <SchemeCard key={s.scheme_id} scheme={s} lang={lang} />
        ))}
      </div>
    </div>
  );
}
