import { useId, useRef, useState, type DragEvent } from "react";
import { FileUp, X } from "lucide-react";
import { useT } from "../state/session";

interface FileDropProps {
  label: string;
  accept: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  hint?: string;
  /** Optional per-file annotation (e.g. "not a recognised table"). */
  annotate?: (f: File) => string | null;
}

function size(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function FileDrop({ label, accept, multiple, files, onChange, hint, annotate }: FileDropProps) {
  const t = useT();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const add = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    if (!multiple) return onChange(incoming.slice(0, 1));
    const byName = new Map(files.map((f) => [f.name, f]));
    incoming.forEach((f) => byName.set(f.name, f));
    onChange(Array.from(byName.values()));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    add(e.dataTransfer.files);
  };

  return (
    <div className="field">
      <span className="field-label" id={`${id}-label`}>
        {label}
      </span>
      <label
        htmlFor={id}
        className={`dropzone ${over ? "is-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <FileUp size={22} aria-hidden="true" />
        <span>
          <strong>{multiple ? t("chooseFiles") : t("chooseFile")}</strong> {t("orDropHere")}
          <span className="dropzone-accept">{accept.split(",").join(" ")}</span>
        </span>
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          aria-labelledby={`${id}-label`}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {hint && <span className="field-hint">{hint}</span>}
      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f) => {
            const note = annotate?.(f);
            return (
              <li key={f.name} className={note ? "has-note" : ""}>
                <span className="file-name mono">{f.name}</span>
                <span className="muted small">{size(f.size)}</span>
                {note && <span className="small file-note">{note}</span>}
                <button
                  type="button"
                  className="icon-btn icon-btn--xs"
                  aria-label={t("removeFile", { name: f.name })}
                  onClick={() => onChange(files.filter((x) => x !== f))}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
