import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Cpu, Eraser, Search } from "lucide-react";
import { api, errorMessage } from "../api";
import type { EligibilityAttributes, EligibilityResponse, Verdict } from "../types";
import { useSession } from "../state/session";
import { DISTRICTS, OCCUPATIONS } from "../lib/attributes";
import { formatDate } from "../lib/format";
import { loadJSON, saveJSON } from "../lib/storage";
import { EligibilityCard } from "../components/EligibilityCard";
import { VerdictChip } from "../components/Badges";
import { Notice, PageHeader, Spinner } from "../components/common";

interface FormState {
  age: string;
  annual_household_income: string;
  land_holding_acres: string;
  gender: string;
  category: string;
  district: string;
  residence_type: string;
  is_disabled: string;
  disability_percent: string;
  occupation: string;
}

const EMPTY: FormState = {
  age: "",
  annual_household_income: "",
  land_holding_acres: "",
  gender: "",
  category: "",
  district: "",
  residence_type: "",
  is_disabled: "",
  disability_percent: "",
  occupation: "",
};

const FORM_KEY = "schemesathi.eligibility.form.v1";
const VERDICT_ORDER: Verdict[] = ["appears_eligible", "verify_with_officer", "need_more_information", "not_eligible"];

function toAttributes(f: FormState): EligibilityAttributes {
  const a: EligibilityAttributes = {};
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  const age = num(f.age);
  if (age !== undefined && Number.isFinite(age)) a.age = age;
  const inc = num(f.annual_household_income);
  if (inc !== undefined && Number.isFinite(inc)) a.annual_household_income = inc;
  const land = num(f.land_holding_acres);
  if (land !== undefined && Number.isFinite(land)) a.land_holding_acres = land;
  if (f.gender) a.gender = f.gender as EligibilityAttributes["gender"];
  if (f.category) a.category = f.category as EligibilityAttributes["category"];
  if (f.district) a.district = f.district;
  if (f.residence_type) a.residence_type = f.residence_type as EligibilityAttributes["residence_type"];
  if (f.is_disabled) a.is_disabled = f.is_disabled as "Y" | "N";
  if (f.is_disabled === "N") a.disability_percent = 0;
  const pct = num(f.disability_percent);
  if (f.is_disabled === "Y" && pct !== undefined && Number.isFinite(pct)) a.disability_percent = pct;
  if (f.occupation) a.occupation = f.occupation;
  return a;
}

function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function EligibilityPage() {
  const { t, citizenId, state } = useSession();
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY, ...(loadJSON<Partial<FormState>>(FORM_KEY) ?? {}) }));
  const [result, setResult] = useState<EligibilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lang = state.language === "auto" ? "en" : state.language;
  const resultsRef = useRef<HTMLElement>(null);

  // On narrow screens the results sit below the form: bring them into view.
  useEffect(() => {
    if (!result || !resultsRef.current || window.innerWidth >= 960) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, [result]);

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    saveJSON(FORM_KEY, next);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.eligibility(citizenId, {
        attributes: toAttributes(form),
        as_of_date: state.asOfDate ?? undefined,
      });
      setResult(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setForm(EMPTY);
    saveJSON(FORM_KEY, EMPTY);
    setResult(null);
    setError(null);
  };

  const groups = VERDICT_ORDER.map((v) => ({ verdict: v, items: (result?.results ?? []).filter((r) => r.verdict === v) })).filter(
    (g) => g.items.length > 0,
  );

  const select = (k: keyof FormState, options: { value: string; label: string }[]) => (
    <select id={`f-${k}`} value={form[k]} onChange={set(k)}>
      <option value="">{t("notSure")}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="page">
      <PageHeader title={t("eligTitle")} intro={t("eligIntro")} />
      <div className="elig-layout">
        <form className="card elig-form" onSubmit={submit} noValidate>
          <fieldset>
            <legend>{t("aboutAttributes")}</legend>
            <div className="form-grid">
              <Field label={t("f_age")} hint={t("leaveBlank")} htmlFor="f-age">
                <input id="f-age" type="number" inputMode="numeric" min={0} max={120} value={form.age} onChange={set("age")} />
              </Field>
              <Field label={t("f_gender")} htmlFor="f-gender">
                {select("gender", [
                  { value: "female", label: t("g_female") },
                  { value: "male", label: t("g_male") },
                  { value: "other", label: t("g_other") },
                ])}
              </Field>
              <Field label={t("f_occupation")} htmlFor="f-occupation">
                {select(
                  "occupation",
                  OCCUPATIONS.map((o) => ({ value: o, label: t(`occ_${o}` as const) })),
                )}
              </Field>
              <Field label={t("f_district")} htmlFor="f-district">
                {select(
                  "district",
                  DISTRICTS.map((d) => ({ value: d, label: d })),
                )}
              </Field>
              <Field label={t("f_residence")} htmlFor="f-residence_type">
                {select("residence_type", [
                  { value: "rural", label: t("res_rural") },
                  { value: "urban", label: t("res_urban") },
                ])}
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend>{t("aboutHousehold")}</legend>
            <div className="form-grid">
              <Field label={t("f_income")} hint={t("leaveBlank")} htmlFor="f-income">
                <div className="input-affix">
                  <span aria-hidden="true">₹</span>
                  <input
                    id="f-income"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    value={form.annual_household_income}
                    onChange={set("annual_household_income")}
                  />
                </div>
              </Field>
              <Field label={t("f_land")} hint={t("leaveBlank")} htmlFor="f-land">
                <input
                  id="f-land"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.1}
                  value={form.land_holding_acres}
                  onChange={set("land_holding_acres")}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend>
              {t("aboutSensitive")} <span className="legend-hint">{t("sensitiveHint")}</span>
            </legend>
            <div className="form-grid">
              <Field label={t("f_category")} htmlFor="f-category">
                {select("category", [
                  { value: "general", label: t("cat_general") },
                  { value: "obc", label: t("cat_obc") },
                  { value: "sc", label: t("cat_sc") },
                  { value: "st", label: t("cat_st") },
                ])}
              </Field>
              <Field label={t("f_disabled")} htmlFor="f-is_disabled">
                {select("is_disabled", [
                  { value: "Y", label: t("yes") },
                  { value: "N", label: t("no") },
                ])}
              </Field>
              {form.is_disabled === "Y" && (
                <Field label={t("f_disabilityPercent")} hint={t("leaveBlank")} htmlFor="f-disability">
                  <input
                    id="f-disability"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={form.disability_percent}
                    onChange={set("disability_percent")}
                  />
                </Field>
              )}
            </div>
          </fieldset>

          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? (
                <Spinner label={t("checking")} />
              ) : (
                <>
                  <Search size={18} aria-hidden="true" /> {t("checkButton")}
                </>
              )}
            </button>
            <button type="button" className="btn btn--ghost" onClick={clear}>
              <Eraser size={18} aria-hidden="true" /> {t("clearForm")}
            </button>
          </div>
        </form>

        <section className="elig-results" aria-live="polite" ref={resultsRef}>
          <p className="engine-note">
            <Cpu size={16} aria-hidden="true" /> {t("engineNote")}
          </p>
          {error && <Notice tone="error">{error}</Notice>}
          {!result && !error && <div className="placeholder-card">{t("eligEmpty")}</div>}
          {result && (
            <>
              <h2 className="results-title">{t("resultsTitle", { date: formatDate(result.as_of_date, lang) })}</h2>
              {groups.length === 0 && <p className="muted">{t("noResults")}</p>}
              {groups.map((g) => (
                <div className="verdict-group" key={g.verdict}>
                  <div className="verdict-group-head">
                    <VerdictChip verdict={g.verdict} />
                    <span className="count-badge">{g.items.length}</span>
                  </div>
                  <div className="elig-list">
                    {g.items.map((v) => (
                      <EligibilityCard key={v.scheme_id} verdict={v} lang={lang} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
