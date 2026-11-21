// Readable rendering of arbitrary JSON from the API (audit records, tool output, bundles).
import { ChevronRight } from "lucide-react";
import { displayValue, humanize, isPlainObject } from "../lib/format";

function isScalar(v: unknown): boolean {
  return v === null || ["string", "number", "boolean", "undefined"].includes(typeof v);
}

function Scalar({ value }: { value: unknown }) {
  if (typeof value === "boolean") return <span className={`bool bool--${value}`}>{value ? "true" : "false"}</span>;
  if (value === null || value === undefined || value === "") return <span className="muted">—</span>;
  if (typeof value === "number") return <span className="num">{value}</span>;
  return <span className="str">{displayValue(value)}</span>;
}

interface JsonViewProps {
  value: unknown;
  depth?: number;
  /** Nested objects deeper than this are collapsed. */
  openDepth?: number;
}

export function JsonView({ value, depth = 0, openDepth = 1 }: JsonViewProps) {
  if (isScalar(value)) return <Scalar value={value} />;

  if (Array.isArray(value)) {
    if (!value.length) return <span className="muted">[ ]</span>;
    if (value.every(isScalar)) {
      return (
        <span className="json-chips">
          {value.map((v, i) => (
            <span className="json-chip" key={i}>
              {displayValue(v)}
            </span>
          ))}
        </span>
      );
    }
    return (
      <ol className="json-list">
        {value.map((v, i) => (
          <li key={i}>
            <JsonView value={v} depth={depth + 1} openDepth={openDepth} />
          </li>
        ))}
      </ol>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (!entries.length) return <span className="muted">{"{ }"}</span>;
    return (
      <dl className="json-obj">
        {entries.map(([k, v]) => {
          const complex = !isScalar(v) && !(Array.isArray(v) && v.every(isScalar));
          if (complex && depth >= openDepth) {
            return (
              <div className="json-row json-row--block" key={k}>
                <details className="json-details">
                  <summary>
                    <ChevronRight size={14} className="chev" aria-hidden="true" />
                    <span className="json-key">{humanize(k)}</span>
                    <span className="muted small">{Array.isArray(v) ? `${v.length}` : ""}</span>
                  </summary>
                  <div className="json-nested">
                    <JsonView value={v} depth={depth + 1} openDepth={openDepth} />
                  </div>
                </details>
              </div>
            );
          }
          return (
            <div className={`json-row ${complex ? "json-row--block" : ""}`} key={k}>
              <dt className="json-key">{humanize(k)}</dt>
              <dd>
                <JsonView value={v} depth={depth + 1} openDepth={openDepth} />
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }
  return <Scalar value={String(value)} />;
}

export function RawJson({ value, label }: { value: unknown; label: string }) {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return (
    <details className="raw-json">
      <summary>
        <ChevronRight size={16} className="chev" aria-hidden="true" />
        {label}
      </summary>
      <pre className="code-block">{text}</pre>
    </details>
  );
}
