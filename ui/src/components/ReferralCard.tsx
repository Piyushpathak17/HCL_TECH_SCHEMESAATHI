import { ArrowRight, UserCheck } from "lucide-react";
import type { ReferralBundle } from "../types";
import { useT } from "../state/session";
import { useUI } from "../state/ui";
import { humanize } from "../lib/format";

export function priorityTone(p?: string): string {
  if (p === "urgent") return "red";
  if (p === "high") return "amber";
  if (p === "normal") return "blue";
  return "slate";
}

export function ReferralCard({ referralId, referral }: { referralId?: string | null; referral?: ReferralBundle | null }) {
  const t = useT();
  const { openReferral } = useUI();
  if (!referralId && !referral) return null;
  const queue = referral?.queue;
  const priority = referral?.priority;

  return (
    <section className="referral-card">
      <header className="referral-head">
        <span className="referral-icon">
          <UserCheck size={22} aria-hidden="true" />
        </span>
        <div>
          <h3>{t("referralTitle")}</h3>
          <p className="small muted">{t("referralNote")}</p>
        </div>
      </header>
      <dl className="referral-facts">
        {queue && (
          <div>
            <dt>{t("queue")}</dt>
            <dd>{humanize(queue)}</dd>
          </div>
        )}
        {priority && (
          <div>
            <dt>{t("priority")}</dt>
            <dd>
              <span className={`chip chip--sm chip--${priorityTone(priority)}`}>{humanize(priority)}</span>
            </dd>
          </div>
        )}
        {referralId && (
          <div>
            <dt>{t("referenceId")}</dt>
            <dd className="mono">{referralId}</dd>
          </div>
        )}
      </dl>
      {referralId && (
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => openReferral(referralId)}>
          {t("viewBundle")} <ArrowRight size={16} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
