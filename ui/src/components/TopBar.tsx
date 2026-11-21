import { useState } from "react";
import { Check, ChevronDown, Globe, ShieldAlert, SlidersHorizontal, TriangleAlert, UserRound, UsersRound } from "lucide-react";
import { api, errorMessage } from "../api";
import type { DemoCitizen } from "../types";
import { LANGUAGE_NAMES, LANGUAGE_OPTIONS, type UiLanguage } from "../i18n";
import { GUEST, identityFromCitizen, useSession } from "../state/session";
import { formatDate, todayISO } from "../lib/format";
import { Logo, Spinner, Wordmark } from "./common";
import { Popover } from "./popover";

function LanguageSelect() {
  const { t, state, dispatch } = useSession();
  const current = LANGUAGE_OPTIONS.find((o) => o.value === state.language) ?? LANGUAGE_OPTIONS[0];
  const isAuto = current.value === "auto";
  return (
    <div className="lang-select" title={t("language")}>
      <Globe size={18} aria-hidden="true" className="lang-select-icon" />
      <span className="lang-current" aria-hidden="true" lang={isAuto ? undefined : current.value}>
        <span className="lang-long">{isAuto ? t("autoDetect") : current.label}</span>
        <span className="lang-short">{isAuto ? t("autoShort") : current.label}</span>
      </span>
      <ChevronDown size={16} aria-hidden="true" className="lang-select-chev" />
      <select
        aria-label={t("language")}
        value={state.language}
        onChange={(e) => dispatch({ type: "setLanguage", language: e.target.value as UiLanguage })}
      >
        {LANGUAGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} lang={o.value === "auto" ? undefined : o.value}>
            {o.value === "auto" ? t("autoDetect") : o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function IdentityMenu() {
  const { t, state, dispatch } = useSession();
  const [citizens, setCitizens] = useState<DemoCitizen[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = state.identity;
  const isGuest = id.citizen_id === "guest";
  const noConsent = !isGuest && id.consent_given === "N";

  const load = () => {
    if (citizens || loading) return;
    setLoading(true);
    setError(null);
    api
      .demoCitizens("guest")
      .then((c) => setCitizens(Array.isArray(c) ? c : []))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  };

  return (
    <Popover
      label={t("signedInAs")}
      trigger={(p) => (
        <button
          type="button"
          className={`id-btn ${noConsent ? "id-btn--warn" : ""}`}
          {...p}
          onClick={() => {
            load();
            p.onClick();
          }}
        >
          <UserRound size={18} aria-hidden="true" />
          <span className="id-btn-text">
            <span className="id-btn-name">{isGuest ? t("guest") : id.citizen_id}</span>
            {!isGuest && id.district && <span className="id-btn-sub">{id.district}</span>}
          </span>
          {noConsent && <TriangleAlert size={15} aria-hidden="true" className="id-warn-icon" />}
          <ChevronDown size={16} aria-hidden="true" className="hide-sm" />
        </button>
      )}
    >
      {(close) => (
        <div className="id-panel">
          <div className="popover-title">{t("signedInAs")}</div>
          {noConsent && (
            <p className="id-consent-note">
              <ShieldAlert size={16} aria-hidden="true" />
              {t("consentNoNote")}
            </p>
          )}
          <ul className="id-list" role="listbox" aria-label={t("signedInAs")}>
            <li>
              <button
                type="button"
                role="option"
                aria-selected={isGuest}
                className="id-option"
                onClick={() => {
                  dispatch({ type: "setIdentity", identity: GUEST });
                  close();
                }}
              >
                <span className="id-option-main">
                  <strong>{t("guest")}</strong>
                  <span className="small muted">{t("guestDesc")}</span>
                </span>
                {isGuest && <Check size={18} aria-hidden="true" className="id-check" />}
              </button>
            </li>
          </ul>
          <div className="popover-subtitle">
            <UsersRound size={15} aria-hidden="true" /> {t("demoCitizens")}
          </div>
          {loading && <Spinner label={t("loading")} />}
          {error && (
            <p className="small error-text">
              {t("couldNotLoadCitizens")} {error}
            </p>
          )}
          {citizens && (
            <ul className="id-list id-list--scroll" role="listbox" aria-label={t("demoCitizens")}>
              {citizens.map((c) => {
                const selected = c.citizen_id === id.citizen_id;
                return (
                  <li key={c.citizen_id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className="id-option"
                      onClick={() => {
                        dispatch({ type: "setIdentity", identity: identityFromCitizen(c) });
                        close();
                      }}
                    >
                      <span className="id-option-main">
                        <strong className="mono">{c.citizen_id}</strong>
                        <span className="small muted">
                          {c.district} · {c.residence_type} · {LANGUAGE_NAMES[c.preferred_language] ?? c.preferred_language}
                        </span>
                      </span>
                      <span className={`chip chip--sm ${c.consent_given === "Y" ? "chip--green" : "chip--amber"}`}>
                        {c.consent_given === "Y" ? t("consentYes") : t("consentNo")}
                      </span>
                      {selected && <Check size={18} aria-hidden="true" className="id-check" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="small muted popover-foot">{t("switchIdentityNote")}</p>
        </div>
      )}
    </Popover>
  );
}

function AdvancedMenu() {
  const { t, state, dispatch } = useSession();
  const today = todayISO();
  const value = state.asOfDate ?? today;
  const overridden = !!state.asOfDate;
  const uiLang = state.language === "auto" ? "en" : state.language;
  return (
    <Popover
      label={t("advanced")}
      trigger={(p) => (
        <button
          type="button"
          className={`icon-btn icon-btn--bordered ${overridden ? "has-dot" : ""}`}
          aria-label={t("advanced")}
          title={overridden ? t("testingAsOf", { date: formatDate(value, uiLang) }) : t("advanced")}
          {...p}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
        </button>
      )}
    >
      {() => (
        <div className="adv-panel">
          <div className="popover-title">{t("advanced")}</div>
          <label className="field">
            <span className="field-label">{t("asOfDate")}</span>
            <input
              type="date"
              value={value}
              onChange={(e) => {
                const v = e.target.value;
                dispatch({ type: "setAsOfDate", date: !v || v === today ? null : v });
              }}
            />
            <span className="field-hint">{t("asOfDateHint")}</span>
          </label>
          {overridden && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => dispatch({ type: "setAsOfDate", date: null })}
            >
              {t("resetToday")}
            </button>
          )}
        </div>
      )}
    </Popover>
  );
}

export function TopBar() {
  const { t } = useSession();
  return (
    <header className="topbar">
      <a className="brand" href="#/ask" aria-label="SchemeSathi">
        <Logo size={34} />
        <span className="brand-text">
          <Wordmark />
          <span className="brand-tagline">{t("appTagline")}</span>
        </span>
      </a>
      <span className="demo-pill" title={t("demoPill")}>
        <TriangleAlert size={14} aria-hidden="true" />
        <span className="demo-pill-long">{t("demoPill")}</span>
        <span className="demo-pill-short">{t("demoPillShort")}</span>
      </span>
      <div className="topbar-actions">
        <LanguageSelect />
        <IdentityMenu />
        <AdvancedMenu />
      </div>
    </header>
  );
}
