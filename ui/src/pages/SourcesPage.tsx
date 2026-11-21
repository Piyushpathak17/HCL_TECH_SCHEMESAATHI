import { useMemo, useState } from "react";
import { FlaskConical, Search } from "lucide-react";
import { api } from "../api";
import { useSession } from "../state/session";
import { useUI } from "../state/ui";
import { useAsync } from "../lib/useAsync";
import { LANGUAGE_NAMES } from "../i18n";
import { formatDate, humanize } from "../lib/format";
import { ErrorNotice, LoadingBlock, PageHeader } from "../components/common";

const uniq = (xs: (string | null | undefined)[]) =>
  Array.from(new Set(xs.filter((x): x is string => !!x))).sort((a, b) => a.localeCompare(b));

export function SourcesPage() {
  const { t, citizenId, state } = useSession();
  const { openSource } = useUI();
  const lang = state.language === "auto" ? "en" : state.language;
  const { data, error, loading, reload } = useAsync(() => api.sources(citizenId), [citizenId]);
  const [query, setQuery] = useState("");
  const [docType, setDocType] = useState("");
  const [language, setLanguage] = useState("");
  const [scheme, setScheme] = useState("");

  const rows = data ?? [];
  const docTypes = useMemo(() => uniq(rows.map((r) => r.doc_type)), [rows]);
  const languages = useMemo(() => uniq(rows.map((r) => r.language)), [rows]);
  const schemes = useMemo(() => uniq(rows.map((r) => r.scheme_id)), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (docType && r.doc_type !== docType) return false;
      if (language && r.language !== language) return false;
      if (scheme === "__general" ? !!r.scheme_id : scheme && r.scheme_id !== scheme) return false;
      if (!q) return true;
      return [r.source_id, r.title, r.provenance, r.supersedes].some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [rows, query, docType, language, scheme]);

  return (
    <div className="page">
      <PageHeader title={t("sourcesTitle")} intro={t("sourcesIntro")} />
      <div className="toolbar toolbar--wrap">
        <label className="search-input">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">{t("search")}</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} />
        </label>
        <select aria-label={t("colType")} value={docType} onChange={(e) => setDocType(e.target.value)}>
          <option value="">{t("allDocTypes")}</option>
          {docTypes.map((d) => (
            <option key={d} value={d}>
              {humanize(d)}
            </option>
          ))}
        </select>
        <select aria-label={t("colLang")} value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">{t("allLanguages")}</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_NAMES[l] ?? l}
            </option>
          ))}
        </select>
        <select aria-label={t("colScheme")} value={scheme} onChange={(e) => setScheme(e.target.value)}>
          <option value="">{t("allSchemes")}</option>
          <option value="__general">{t("generalDocs")}</option>
          {schemes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {data && <span className="muted small toolbar-count">{t("showingN", { n: filtered.length, total: rows.length })}</span>}
      </div>

      {loading && !data && <LoadingBlock />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && filtered.length === 0 && <p className="muted">{t("noMatch")}</p>}

      {filtered.length > 0 && (
        <div className="card table-card">
          <table className="data-table sources-table">
            <thead>
              <tr>
                <th scope="col">{t("colSource")}</th>
                <th scope="col">{t("colTitle")}</th>
                <th scope="col">{t("colType")}</th>
                <th scope="col">{t("colLang")}</th>
                <th scope="col">{t("colAuthority")}</th>
                <th scope="col">{t("colScheme")}</th>
                <th scope="col">{t("colUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.source_id}
                  className="clickable-row"
                  onClick={() => openSource(r.source_id)}
                >
                  <td data-label={t("colSource")}>
                    <button
                      type="button"
                      className="link-btn mono"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSource(r.source_id);
                      }}
                    >
                      {r.source_id}
                    </button>
                    {String(r.synthetic ?? "").toUpperCase() === "Y" && (
                      <FlaskConical size={14} aria-label={t("synthetic")} className="muted synth-icon" />
                    )}
                  </td>
                  <td data-label={t("colTitle")} className="title-cell" lang={r.language !== "mixed" ? r.language : undefined}>
                    {r.title}
                  </td>
                  <td data-label={t("colType")}>
                    <span className="chip chip--sm chip--teal">{humanize(r.doc_type)}</span>
                  </td>
                  <td data-label={t("colLang")}>{LANGUAGE_NAMES[r.language] ?? r.language}</td>
                  <td data-label={t("colAuthority")}>
                    <span className={`auth-level auth-level--${r.authority_level}`}>{r.authority_level}</span>
                  </td>
                  <td data-label={t("colScheme")} className="mono small">
                    {r.scheme_id || <span className="muted">{t("generalDocs")}</span>}
                  </td>
                  <td data-label={t("colUpdated")} className="nowrap">
                    {formatDate(r.last_updated, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
