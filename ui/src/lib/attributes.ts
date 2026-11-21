// Labels and option lists for the citizen attributes used by the rule engine.
import type { I18nKey, Translate } from "../i18n";
import { displayValue, formatINR, humanize } from "./format";

export const DISTRICTS = ["Nayagaon", "Sundarpur", "Kaverinadu", "Thenpuram"] as const;

export const OCCUPATIONS = [
  "farmer",
  "student",
  "daily_wage",
  "construction_worker",
  "street_vendor",
  "homemaker",
  "salaried",
  "self_employed",
  "retired",
  "unemployed",
] as const;

const ATTR_LABELS: Record<string, I18nKey> = {
  age: "f_age",
  annual_household_income: "f_income",
  land_holding_acres: "f_land",
  gender: "f_gender",
  category: "f_category",
  district: "f_district",
  residence_type: "f_residence",
  is_disabled: "f_disabled",
  disability_percent: "f_disabilityPercent",
  occupation: "f_occupation",
};

export function attrLabel(t: Translate, attr: string): string {
  const key = ATTR_LABELS[attr];
  return key ? t(key) : humanize(attr);
}

const VALUE_LABELS: Record<string, Record<string, I18nKey>> = {
  gender: { female: "g_female", male: "g_male", other: "g_other" },
  category: { general: "cat_general", obc: "cat_obc", sc: "cat_sc", st: "cat_st" },
  residence_type: { rural: "res_rural", urban: "res_urban" },
  is_disabled: { Y: "yes", N: "no" },
  occupation: Object.fromEntries(OCCUPATIONS.map((o) => [o, `occ_${o}` as I18nKey])),
};

/** Human label for a single attribute value, e.g. ("gender","female") -> "Female". */
export function valueLabel(t: Translate, attr: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const map = VALUE_LABELS[attr];
  if (map && typeof value === "string") {
    const parts = value.split(/[;,|]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) return parts.map((p) => (map[p] ? t(map[p]) : p.toUpperCase())).join(" / ");
    if (map[value]) return t(map[value]);
  }
  if (attr === "annual_household_income") {
    const n = Number(value);
    if (Number.isFinite(n)) return `₹${formatINR(n)}`;
  }
  if (attr === "disability_percent" && value !== "") return `${displayValue(value)}%`;
  return displayValue(value);
}

const OP_SYMBOLS: Record<string, string> = {
  ">=": "≥",
  "<=": "≤",
  ">": ">",
  "<": "<",
  "=": "",
  "==": "",
  "!=": "≠",
  in: "",
  not_in: "≠",
};

/** "age", ">=", "60" -> "≥ 60" */
export function ruleExpectation(t: Translate, attr: string, operator: string, expected: string): string {
  const sym = OP_SYMBOLS[operator] ?? operator;
  const val = valueLabel(t, attr, expected);
  return sym ? `${sym} ${val}` : val;
}

/** Quick-reply options for clarification questions: label key + the text sent to the API. */
export const QUICK_REPLIES: Record<string, { label: I18nKey | string; send: string }[]> = {
  gender: [
    { label: "g_female", send: "Female" },
    { label: "g_male", send: "Male" },
    { label: "g_other", send: "Other gender" },
  ],
  residence_type: [
    { label: "res_rural", send: "Rural, I live in a village" },
    { label: "res_urban", send: "Urban, I live in a town or city" },
  ],
  is_disabled: [
    { label: "yes", send: "Yes, I have a disability" },
    { label: "no", send: "No, I do not have a disability" },
  ],
  category: [
    { label: "cat_general", send: "General category" },
    { label: "cat_obc", send: "OBC category" },
    { label: "cat_sc", send: "SC category" },
    { label: "cat_st", send: "ST category" },
  ],
  district: DISTRICTS.map((d) => ({ label: d, send: `${d} district` })),
  occupation: ["farmer", "student", "daily_wage", "homemaker", "salaried", "retired"].map((o) => ({
    label: `occ_${o}`,
    send: `Occupation: ${o.replace(/_/g, " ")}`,
  })),
};
