import { useEffect, useRef, useState } from "react";
import { BookOpen, FlaskConical } from "lucide-react";
import { api } from "../api";
import { useSession } from "../state/session";
import { useAsync } from "../lib/useAsync";
import { LANGUAGE_NAMES, hasKey } from "../i18n";
import { formatDate, humanize } from "../lib/format";
import { Drawer } from "./Drawer";
import { ErrorNotice, KeyValueGrid, LoadingBlock, Notice } from "./common";
import { Markdown } from "./Markdown";
import { JsonView } from "./JsonView";
import {Ref} from "react";

function parseJson(content: string): unknown | undefined {
  const s = content.trim();
  if (!(s.startsWith("{") || s.startsWith("["))) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

export function SourceDrawer({ sourceId, section, onClose }: { sourceId: string; section?: string; onClose: () => void }) {
  const { t, citizenId, state } = useSession();
  const { data, error, loading, reload } = useAsync(() => api.source(citizenId, sourceId), [sourceId, citizenId]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [sectionFound, setSectionFound] = useState(true);
  const uiLang = state.language === "auto" ? "en" : state.language;

  useEffect(() => setSectionFound(true), [sourceId, section]);

  const auth = data ? String(data.authority_level ?? "") : "";
  const authKey = `auth_${auth}`;
  const json = data ? parseJson(data.content ?? "") : undefined;
  const docLang = data?.language && data.language !== "mixed" ? data.language : undefined;

  return (
    <Drawer
      open
      onClose={onClose}
      wide
      icon={<BookOpen size={20} aria-hidden="true" />}
      title={<span className="mono">{sourceId}</span>}
      subtitle={data?.title ? <span lang={docLang}>{data.title}</span> : section}
      bodyRef={bodyRef}
    >
      {loading && !data && <LoadingBlock />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && (
        <>
          <div className="source-meta">
            <div className="source-tags">
              <span className="chip chip--teal chip--sm">{humanize(data.doc_type)}</span>
              {auth && (
                <span className="chip chip--slate chip--sm">
                  {t("authority")} {auth}
                  {hasKey(authKey) ? ` · ${t(authKey)}` : ""}
                </span>
              )}
              {String(data.synthetic ?? "").toUpperCase() === "Y" && (
                <span className="chip chip--violet chip--sm" title={t("syntheticNote")}>
                  <FlaskConical size={13} aria-hidden="true" /> {t("synthetic")}
                </span>
              )}
            </div>
            <KeyValueGrid
              items={[
                [t("languageLabel"), LANGUAGE_NAMES[data.language] ?? data.language],
                [t("schemeLabel"), data.scheme_id ? <span className="mono">{data.scheme_id}</span> : ""],
                [t("effectiveFrom"), formatDate(data.effective_from, uiLang)],
                [t("lastUpdated"), formatDate(data.last_updated, uiLang)],
                [t("validUntil"), formatDate(data.valid_until, uiLang)],
                [t("supersedes"), data.supersedes ? <span className="mono">{data.supersedes}</span> : ""],
                [t("provenance"), data.provenance ?? ""],
                [t("citedSection"), section ?? ""],
              ]}
            />
          </div>
          {section && !sectionFound && !json && <Notice tone="info">{t("sectionNotFound", { section })}</Notice>}
          <div className="source-content">
            {json !== undefined ? (
              <div className="json-doc" lang={docLang}>
                <JsonView value={json} openDepth={2} />
              </div>
            ) : (
              <Markdown
                content={data.content ?? ""}
                highlightSection={section}
                lang={docLang}
                onSectionResolved={setSectionFound}
              />
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}
