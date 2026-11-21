import { FileText } from "lucide-react";
import type { Citation } from "../types";
import { useT } from "../state/session";
import { useUI } from "../state/ui";

export function citationLabel(c: Citation): string {
  return c.section ? `${c.source_id} · ${c.section}` : c.source_id;
}

export function CitationChips({ citations }: { citations: Citation[] }) {
  const t = useT();
  const { openSource } = useUI();
  // De-duplicate identical source+section pairs.
  const seen = new Set<string>();
  const unique = citations.filter((c) => {
    const k = `${c.source_id}|${c.section}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (!unique.length) return null;
  return (
    <div className="citations">
      <span className="citations-label">{t("sources")}</span>
      <ul className="citation-list">
        {unique.map((c) => (
          <li key={`${c.source_id}|${c.section}`}>
            <button
              type="button"
              className="citation-chip"
              onClick={() => openSource(c.source_id, c.section)}
              title={c.title || c.label || undefined}
            >
              <FileText size={14} aria-hidden="true" />
              <span>{citationLabel(c)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
