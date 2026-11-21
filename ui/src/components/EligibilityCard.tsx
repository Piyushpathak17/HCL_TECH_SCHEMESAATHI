import { useId, useState } from "react";
import { CalendarClock, ChevronDown, CircleCheck, CircleHelp, CircleX, GitCompareArrows, TriangleAlert } from "lucide-react";
import type { RuleResult, SchemeVerdict } from "../types";
import { useSession, useT } from "../state/session";
import { useUI } from "../state/ui";
import { attrLabel, ruleExpectation, valueLabel } from "../lib/attributes";
import { displayValue, formatDate, humanize, isPlainObject } from "../lib/format";
import { StatusChip, VerdictChip, verdictTone } from "./Badges";

function schemeNames(v: SchemeVerdict, lang: string): { primary: string; english?: string } {
  const names = v.scheme_names ?? {};
  const english = names.en || names.name_en || v.scheme_name || v.scheme_id;
  const local = names[lang] || names[`name_${lang}`];
  if (local && local !== english) return { primary: local, english };
  return { primary: english };
}

function ResultIcon({ result }: { result: RuleResult["result"] }) {
  const t = useT();
  if (result === "passed")
    return (
      <span className="rule-result rule-result--passed">
        <CircleCheck size={16} aria-hidden="true" /> {t("passed")}
      </span>
    );
  if (result === "failed")
    return (
      <span className="rule-result rule-result--failed">
        <CircleX size={16} aria-hidden="true" /> {t("failed")}
      </span>
    );
  return (
    <span className="rule-result rule-result--unknown">
      <CircleHelp size={16} aria-hidden="true" /> {t("unknown")}
    </span>
  );
}

function describeItem(item: Record<string, unknown>): string {
  for (const k of ["description", "message", "detail", "summary", "note", "reason", "change"]) {
    if (typeof item[k] === "string" && item[k]) return item[k] as string;
  }
  return Object.entries(item)
    .filter(([, v]) => v !== null && v !== "" && v !== undefined)
    .map(([k, v]) => `${humanize(k)}: ${displayValue(v)}`)
    .join(" · ");
}

function itemSources(item: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(item)) {
    if (!/source|circular|supersed/i.test(k)) continue;
    if (typeof v === "string" && /^[A-Z][A-Z0-9-]{2,}$/.test(v)) out.push(v);
    if (Array.isArray(v)) v.forEach((x) => typeof x === "string" && /^[A-Z][A-Z0-9-]{2,}$/.test(x) && out.push(x));
  }
  return Array.from(new Set(out));
}

function NoteList({ title, items, tone }: { title: string; items: Record<string, unknown>[]; tone: "warn" | "info" }) {
  const { openSource } = useUI();
  if (!items.length) return null;
  const Icon = tone === "warn" ? GitCompareArrows : CalendarClock;
  return (
    <div className={`elig-notes elig-notes--${tone}`}>
      <div className="elig-notes-title">
        <Icon size={16} aria-hidden="true" /> {title}
      </div>
      <ul>
        {items.map((it, i) => {
          const obj = isPlainObject(it) ? it : { description: String(it) };
          return (
            <li key={i}>
              {describeItem(obj)}
              {itemSources(obj).map((s) => (
                <button key={s} type="button" className="link-btn mono small" onClick={() => openSource(s)}>
                  {s}
                </button>
              ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function EligibilityCard({ verdict, lang }: { verdict: SchemeVerdict; lang: string }) {
  const { t, state } = useSession();
  const uiLang = state.language === "auto" ? "en" : state.language;
  const { openSource } = useUI();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const names = schemeNames(verdict, lang);
  const rules = verdict.rules ?? [];
  const status = verdict.scheme_status || "open";

  return (
    <article className={`elig-card elig-card--${verdictTone(verdict.verdict)}`}>
      <div className="elig-head">
        <div className="elig-names">
          <h3 lang={lang}>{names.primary}</h3>
          {names.english && <div className="elig-english">{names.english}</div>}
        </div>
        <VerdictChip verdict={verdict.verdict} />
      </div>

      <div className="elig-meta">
        <StatusChip status={status} />
        <span className="elig-date">
          <CalendarClock size={15} aria-hidden="true" />
          {verdict.apply_until ? t("lastDate", { date: formatDate(verdict.apply_until, uiLang) }) : t("noLastDate")}
        </span>
        <span className="mono small muted">{verdict.scheme_id}</span>
      </div>

      {!verdict.can_apply_now && (
        <p className="elig-warn">
          <TriangleAlert size={15} aria-hidden="true" /> {t("cannotApplyNow")}
        </p>
      )}
      {verdict.verdict === "need_more_information" && verdict.unknown?.length > 0 && (
        <p className="elig-line">{t("stillNeeded", { list: verdict.unknown.map((a) => attrLabel(t, a)).join(", ") })}</p>
      )}
      {verdict.verdict === "not_eligible" && verdict.failed?.length > 0 && (
        <p className="elig-line">
          {t("failedOn", {
            list: Array.from(
              new Set(
                verdict.failed.map((id) => {
                  const r = rules.find((x) => x.rule_id === id);
                  return r ? attrLabel(t, r.attribute) : id;
                }),
              ),
            ).join(", "),
          })}
        </p>
      )}

      <NoteList title={t("conflicts")} items={verdict.conflicts ?? []} tone="warn" />
      <NoteList title={t("upcomingChanges")} items={verdict.upcoming_changes ?? []} tone="info" />

      {rules.length > 0 && (
        <>
          <button
            type="button"
            className="disclosure"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronDown size={18} className={`chev-rot ${open ? "is-open" : ""}`} aria-hidden="true" />
            {t("showRules", { n: rules.length })}
          </button>
          {open && (
            <div id={panelId} className="rules-wrap">
              <table className="rules-table">
                <thead>
                  <tr>
                    <th scope="col">{t("colRule")}</th>
                    <th scope="col">{t("colAttribute")}</th>
                    <th scope="col">{t("colExpected")}</th>
                    <th scope="col">{t("colActual")}</th>
                    <th scope="col">{t("colResult")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.rule_id} className={`rule-row rule-row--${r.result}`}>
                      <td data-label={t("colRule")}>
                        <span className="mono">{r.rule_id}</span>
                        {r.rule_group && <span className="or-tag">{t("orGroup", { g: r.rule_group })}</span>}
                        {r.source_id && (
                          <button
                            type="button"
                            className="link-btn small"
                            onClick={() => openSource(r.source_id, r.source_section)}
                          >
                            {r.source_id}
                            {r.source_section ? ` · ${r.source_section}` : ""}
                          </button>
                        )}
                      </td>
                      <td data-label={t("colAttribute")}>{attrLabel(t, r.attribute)}</td>
                      <td data-label={t("colExpected")}>{ruleExpectation(t, r.attribute, r.operator, r.expected)}</td>
                      <td data-label={t("colActual")}>
                        {r.actual === null || r.actual === undefined || r.actual === "" ? (
                          <span className="muted">{t("notGiven")}</span>
                        ) : (
                          valueLabel(t, r.attribute, r.actual)
                        )}
                      </td>
                      <td data-label={t("colResult")}>
                        <ResultIcon result={r.result} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {verdict.verdict === "appears_eligible" && <p className="elig-foot muted small">{t("departmentDecides")}</p>}
    </article>
  );
}

export function EligibilityList({ items, lang }: { items: SchemeVerdict[]; lang: string }) {
  if (!items.length) return null;
  return (
    <div className="elig-list">
      {items.map((v) => (
        <EligibilityCard key={v.scheme_id} verdict={v} lang={lang} />
      ))}
    </div>
  );
}
