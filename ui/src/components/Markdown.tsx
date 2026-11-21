// Minimal Markdown renderer for knowledge-base documents, with support for highlighting the
// section a citation points to. Sections are headings like "## 3 Eligibility" or "### 3.4 ...".
import { Fragment, useEffect, useMemo, useRef, type ReactNode } from "react";
import { renderInline } from "./RichText";

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "para"; lines: string[] }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "code"; text: string }
  | { kind: "table"; rows: string[][] }
  | { kind: "hr" };

function parse(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.trim().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) buf.push(lines[i++]);
      i++;
      blocks.push({ kind: "code", text: buf.join("\n") });
      continue;
    }
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      blocks.push({ kind: "heading", level: h[1].length, text: h[2] });
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      blocks.push({ kind: "table", rows });
      continue;
    }
    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push({ kind: "quote", lines: buf });
      continue;
    }
    const li = /^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/;
    if (li.test(line)) {
      const ordered = !!li.exec(line)?.[1];
      const items: string[] = [];
      while (i < lines.length && li.test(lines[i])) {
        items.push(li.exec(lines[i])?.[2] ?? "");
        i++;
        // continuation lines indented under the item
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !li.test(lines[i])) {
          items[items.length - 1] += " " + lines[i].trim();
          i++;
        }
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !li.test(lines[i]) &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].trim().startsWith("```")
    ) {
      buf.push(lines[i++]);
    }
    blocks.push({ kind: "para", lines: buf });
  }
  return blocks;
}

function sectionNumber(text: string): string | null {
  const m = /^(?:section\s+|§\s*)?(\d+(?:\.\d+)*)\b/i.exec(text.trim());
  return m ? m[1] : null;
}

/** Find the block index of the heading that `section` (e.g. "3.4 Priority condition") refers to. */
function findSection(blocks: Block[], section?: string): number {
  if (!section) return -1;
  const wanted = sectionNumber(section);
  const headings = blocks
    .map((b, idx) => ({ b, idx }))
    .filter((x): x is { b: Extract<Block, { kind: "heading" }>; idx: number } => x.b.kind === "heading");
  if (wanted) {
    // Exact number first, then walk up the parents: 3.4.1 -> 3.4 -> 3
    const parts = wanted.split(".");
    for (let n = parts.length; n > 0; n--) {
      const target = parts.slice(0, n).join(".");
      const hit = headings.find((x) => sectionNumber(x.b.text) === target);
      if (hit) return hit.idx;
    }
  }
  const needle = section.replace(/^\s*\d+(?:\.\d+)*\.?\s*/, "").toLowerCase().trim();
  if (needle) {
    const hit = headings.find((x) => x.b.text.toLowerCase().includes(needle));
    if (hit) return hit.idx;
  }
  return -1;
}

function renderBlock(b: Block, key: string): ReactNode {
  switch (b.kind) {
    case "heading": {
      const Tag = `h${Math.min(6, b.level + 1)}` as "h2";
      return (
        <Tag key={key} className={`md-h md-h${b.level}`}>
          {renderInline(b.text, key)}
        </Tag>
      );
    }
    case "para":
      return (
        <p key={key}>
          {b.lines.map((l, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {renderInline(l, `${key}-${i}`)}
            </Fragment>
          ))}
        </p>
      );
    case "list": {
      const items = b.items.map((it, i) => <li key={i}>{renderInline(it, `${key}-${i}`)}</li>);
      return b.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
    }
    case "quote":
      return (
        <blockquote key={key}>
          {b.lines.map((l, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {renderInline(l, `${key}-${i}`)}
            </Fragment>
          ))}
        </blockquote>
      );
    case "code":
      return (
        <pre key={key} className="code-block">
          <code>{b.text}</code>
        </pre>
      );
    case "table": {
      const [head, ...body] = b.rows;
      return (
        <div key={key} className="md-table-wrap">
          <table className="md-table">
            {head && (
              <thead>
                <tr>
                  {head.map((c, i) => (
                    <th key={i}>{renderInline(c, `${key}-h${i}`)}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, i) => (
                    <td key={i}>{renderInline(c, `${key}-${ri}-${i}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "hr":
      return <hr key={key} />;
  }
}

interface MarkdownProps {
  content: string;
  highlightSection?: string;
  lang?: string;
  /** Called once with whether the cited section was located. */
  onSectionResolved?: (found: boolean) => void;
}

export function Markdown({ content, highlightSection, lang, onSectionResolved }: MarkdownProps) {
  const blocks = useMemo(() => parse(content), [content]);
  const start = useMemo(() => findSection(blocks, highlightSection), [blocks, highlightSection]);
  const hlRef = useRef<HTMLDivElement>(null);

  let end = blocks.length;
  if (start >= 0) {
    const level = (blocks[start] as Extract<Block, { kind: "heading" }>).level;
    for (let j = start + 1; j < blocks.length; j++) {
      const b = blocks[j];
      if (b.kind === "heading" && b.level <= level) {
        end = j;
        break;
      }
    }
  }

  useEffect(() => {
    onSectionResolved?.(start >= 0 || !highlightSection);
    if (start >= 0 && hlRef.current) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      // Wait a frame so the drawer has laid out.
      requestAnimationFrame(() => hlRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, content]);

  if (start < 0) {
    return (
      <div className="markdown" lang={lang} dir="auto">
        {blocks.map((b, i) => renderBlock(b, `b${i}`))}
      </div>
    );
  }
  return (
    <div className="markdown" lang={lang} dir="auto">
      {blocks.slice(0, start).map((b, i) => renderBlock(b, `b${i}`))}
      <div className="md-highlight" ref={hlRef} tabIndex={-1}>
        {blocks.slice(start, end).map((b, i) => renderBlock(b, `b${start + i}`))}
      </div>
      {blocks.slice(end).map((b, i) => renderBlock(b, `b${end + i}`))}
    </div>
  );
}
