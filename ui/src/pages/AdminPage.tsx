import { useState, type FormEvent } from "react";
import { Bot, Database, FileUp, Layers, RefreshCw, Server, TableProperties, type LucideIcon } from "lucide-react";
import { api, errorMessage } from "../api";
import type { AdminLoadResponse, HealthComponent, IngestMetadata, IngestResponse } from "../types";
import { useSession } from "../state/session";
import { useAsync } from "../lib/useAsync";
import { displayValue, formatTime, humanize, todayISO } from "../lib/format";
import { hasKey, type I18nKey } from "../i18n";
import { ErrorNotice, KeyValueGrid, Notice, PageHeader, Spinner } from "../components/common";
import { FileDrop } from "../components/FileDrop";
import { JsonView } from "../components/JsonView";

const COMPONENT_ICONS: Record<string, LucideIcon> = {
  api: Server,
  sqlite: Database,
  vector_store: Layers,
  llm: Bot,
};

// ---------------------------------------------------------------- health
function HealthPanel() {
  const { t, citizenId, state } = useSession();
  const lang = state.language === "auto" ? "en" : state.language;
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const { data, error, loading, reload } = useAsync(
    () =>
      api.health(citizenId).then((h) => {
        setCheckedAt(new Date());
        return h;
      }),
    [citizenId],
  );
  const components = Object.entries(data?.components ?? {}).filter((e): e is [string, HealthComponent] => !!e[1]);
  const allOk = components.every(([, c]) => c.ok);
  const statusOk = data ? ["ok", "healthy", "ready"].includes(String(data.status).toLowerCase()) : false;
  const overallTone = allOk && statusOk ? "green" : statusOk || components.some(([, c]) => c.ok) ? "amber" : "red";
  const overallLabel = allOk && statusOk ? t("healthy") : overallTone === "amber" ? t("degraded") : t("unhealthy");

  return (
    <section className="card admin-card">
      <header className="card-header">
        <div>
          <h2>{t("health")}</h2>
          {checkedAt && <p className="small muted">{t("checkedAt", { time: formatTime(checkedAt, lang) })}</p>}
        </div>
        <div className="card-header-actions">
          {data && (
            <span className={`chip chip--${overallTone} chip--dot`}>
              <span className="dot" aria-hidden="true" />
              {overallLabel} · {data.status}
            </span>
          )}
          <button type="button" className="btn btn--secondary btn--sm" onClick={reload} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} aria-hidden="true" /> {t("refresh")}
          </button>
        </div>
      </header>
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {loading && !data && <Spinner label={t("loading")} />}
      {components.length > 0 && (
        <div className="health-grid">
          {components.map(([name, c]) => {
            const Icon = COMPONENT_ICONS[name] ?? Server;
            const key = `comp_${name}`;
            const details = Object.entries(c).filter(([k]) => k !== "ok");
            return (
              <div key={name} className={`health-item health-item--${c.ok ? "ok" : "bad"}`}>
                <div className="health-item-head">
                  <Icon size={20} aria-hidden="true" />
                  <strong>{hasKey(key) ? t(key) : humanize(name)}</strong>
                  <span className={`status-dot status-dot--${c.ok ? "ok" : "bad"}`} aria-hidden="true" />
                  <span className="sr-only">{c.ok ? t("healthy") : t("unhealthy")}</span>
                </div>
                <div className={`health-state ${c.ok ? "ok-text" : "error-text"}`}>{c.ok ? t("healthy") : t("unhealthy")}</div>
                {details.length > 0 && (
                  <KeyValueGrid
                    items={details.map(([k, v]) => [humanize(k), typeof v === "object" && v ? <JsonView value={v} /> : displayValue(v)])}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- ingest
const DOC_TYPES = ["guideline", "policy", "circular", "amendment", "faq", "grievance", "community"];
const DEFAULT_AUTHORITY: Record<string, number> = {
  guideline: 1,
  policy: 1,
  circular: 2,
  amendment: 2,
  faq: 4,
  grievance: 4,
  community: 5,
};

function defaultMeta(): IngestMetadata {
  const today = todayISO();
  return {
    source_id: "",
    doc_type: "guideline",
    title: "",
    language: "en",
    authority_level: 1,
    scheme_id: "",
    last_updated: today,
    effective_from: today,
    valid_until: "",
    supersedes: "",
    provenance: "Uploaded via SchemeSathi admin",
    synthetic: "Y",
  };
}

function IngestForm() {
  const { t, citizenId } = useSession();
  const [files, setFiles] = useState<File[]>([]);
  const [meta, setMeta] = useState<IngestMetadata>(defaultMeta);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const schemes = useAsync(() => api.schemes(citizenId), [citizenId]);

  const set = <K extends keyof IngestMetadata>(k: K, v: IngestMetadata[K]) => setMeta((m) => ({ ...m, [k]: v }));

  const onFiles = (fs: File[]) => {
    setFiles(fs);
    const f = fs[0];
    if (!f) return;
    const base = f.name.replace(/\.[^.]+$/, "");
    const isJson = /\.json$/i.test(f.name);
    setMeta((m) => {
      const docType = isJson ? "grievance" : m.doc_type;
      return {
        ...m,
        source_id: m.source_id || base.toUpperCase().replace(/[^A-Z0-9-]+/g, "-"),
        title: m.title || humanize(base),
        doc_type: docType,
        authority_level: DEFAULT_AUTHORITY[docType] ?? m.authority_level,
      };
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!files[0] || !meta.source_id.trim()) {
      setError(`${t("file")} / source_id: ${t("requiredField")}`);
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.ingest(citizenId, files[0], { ...meta, source_id: meta.source_id.trim() }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const text = (k: keyof IngestMetadata, label: string, props: Record<string, unknown> = {}) => (
    <div className="field">
      <label className="field-label" htmlFor={`ing-${k}`}>
        {label}
      </label>
      <input
        id={`ing-${k}`}
        value={String(meta[k] ?? "")}
        onChange={(e) => set(k, e.target.value as never)}
        {...props}
      />
    </div>
  );

  return (
    <section className="card admin-card">
      <header className="card-header">
        <div>
          <h2>
            <FileUp size={20} aria-hidden="true" /> {t("ingestTitle")}
          </h2>
          <p className="small muted">{t("ingestIntro")}</p>
        </div>
      </header>
      <form onSubmit={submit} className="admin-form">
        <FileDrop label={t("file")} accept=".md,.markdown,.json" files={files} onChange={onFiles} />
        <div className="form-grid form-grid--3">
          {text("source_id", `source_id (${t("requiredField")})`, { required: true, className: "mono" })}
          <div className="field">
            <label className="field-label" htmlFor="ing-doc_type">
              doc_type
            </label>
            <select
              id="ing-doc_type"
              value={meta.doc_type}
              onChange={(e) => {
                const d = e.target.value;
                setMeta((m) => ({ ...m, doc_type: d, authority_level: DEFAULT_AUTHORITY[d] ?? m.authority_level }));
              }}
            >
              {DOC_TYPES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ing-language">
              language
            </label>
            <select id="ing-language" value={meta.language} onChange={(e) => set("language", e.target.value)}>
              {["en", "hi", "kn", "ta", "mixed"].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="field field--span2">
            <label className="field-label" htmlFor="ing-title">
              title
            </label>
            <input id="ing-title" value={meta.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ing-authority">
              authority_level
            </label>
            <select
              id="ing-authority"
              value={meta.authority_level}
              onChange={(e) => set("authority_level", Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} · {t(`auth_${n}` as I18nKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ing-scheme">
              scheme_id
            </label>
            <select id="ing-scheme" value={meta.scheme_id} onChange={(e) => set("scheme_id", e.target.value)}>
              <option value="">— {t("generalDocs")}</option>
              {(schemes.data ?? []).map((s) => (
                <option key={s.scheme_id} value={s.scheme_id}>
                  {s.scheme_id} · {s.name_en}
                </option>
              ))}
            </select>
          </div>
          {text("last_updated", "last_updated", { type: "date" })}
          {text("effective_from", "effective_from", { type: "date" })}
          {text("valid_until", "valid_until", { type: "date" })}
          {text("supersedes", "supersedes", { placeholder: "CIR-2026-003;CIR-2026-004", className: "mono" })}
          <div className="field">
            <label className="field-label" htmlFor="ing-synthetic">
              synthetic
            </label>
            <select id="ing-synthetic" value={meta.synthetic} onChange={(e) => set("synthetic", e.target.value as "Y" | "N")}>
              <option value="Y">Y</option>
              <option value="N">N</option>
            </select>
          </div>
          <div className="field field--span3">
            <label className="field-label" htmlFor="ing-provenance">
              provenance
            </label>
            <input id="ing-provenance" value={meta.provenance} onChange={(e) => set("provenance", e.target.value)} />
          </div>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        {result && (
          <Notice tone="ok">
            <strong>{t("ingestDone", { id: result.source_id, n: result.chunks })}</strong>
            {result.effects?.length > 0 && (
              <div className="effects">
                <div className="small muted">{t("effects")}</div>
                <JsonView value={result.effects} openDepth={2} />
              </div>
            )}
          </Notice>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={busy || !files.length}>
            {busy ? <Spinner label={t("ingesting")} /> : t("ingestButton")}
          </button>
        </div>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------- CSV loader
const KNOWN_TABLES = [
  "citizens",
  "applications",
  "appointments",
  "eligibility_rules",
  "schemes",
  "required_documents",
  "service_centres",
  "policy_registry",
];

function LoadCsvForm() {
  const { t, citizenId } = useSession();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminLoadResponse | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!files.length) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.adminLoad(citizenId, files));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const loaded = Object.entries(result?.loaded ?? {});

  return (
    <section className="card admin-card">
      <header className="card-header">
        <div>
          <h2>
            <TableProperties size={20} aria-hidden="true" /> {t("loadTitle")}
          </h2>
          <p className="small muted">{t("loadIntro")}</p>
        </div>
      </header>
      <form onSubmit={submit} className="admin-form">
        <FileDrop
          label={t("csvFiles")}
          accept=".csv"
          multiple
          files={files}
          onChange={setFiles}
          annotate={(f) => (KNOWN_TABLES.includes(f.name.replace(/\.csv$/i, "").toLowerCase()) ? null : t("unrecognisedCsv"))}
        />
        {error && <Notice tone="error">{error}</Notice>}
        {result && (
          <div className="load-result">
            {loaded.length > 0 && (
              <Notice tone="ok">
                <strong>{t("loaded")}</strong>
                <ul className="load-counts">
                  {loaded.map(([table, n]) => (
                    <li key={table}>
                      <span className="mono">{table}</span>
                      <span className="count-badge">{t("rows", { n })}</span>
                    </li>
                  ))}
                </ul>
              </Notice>
            )}
            {result.errors?.length > 0 && (
              <Notice tone="error">
                <strong>{t("errors")}</strong>
                <ul className="plain-list">
                  {result.errors.map((er, i) => (
                    <li key={i}>{er}</li>
                  ))}
                </ul>
              </Notice>
            )}
          </div>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={busy || !files.length}>
            {busy ? <Spinner label={t("loadingFiles")} /> : t("loadButton")}
          </button>
        </div>
      </form>
    </section>
  );
}

export function AdminPage() {
  const { t } = useSession();
  return (
    <div className="page">
      <PageHeader title={t("adminTitle")} intro={t("adminIntro")} />
      <div className="admin-stack">
        <HealthPanel />
        <IngestForm />
        <LoadCsvForm />
      </div>
    </div>
  );
}
