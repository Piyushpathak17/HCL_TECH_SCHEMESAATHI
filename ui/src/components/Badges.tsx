import {
  Ban,
  CircleCheck,
  CircleHelp,
  CircleSlash,
  Hand,
  MessageSquareText,
  SearchX,
  UserCheck,
  CircleAlert,
  CircleX,
  ShieldQuestion,
  type LucideIcon,
} from "lucide-react";
import type { AnswerType, Verdict } from "../types";
import { useT } from "../state/session";

const ANSWER_META: Record<AnswerType, { icon: LucideIcon; tone: string }> = {
  answered: { icon: MessageSquareText, tone: "teal" },
  clarification_needed: { icon: CircleHelp, tone: "amber" },
  confirmation_needed: { icon: Hand, tone: "blue" },
  action_completed: { icon: CircleCheck, tone: "green" },
  referred: { icon: UserCheck, tone: "violet" },
  not_found: { icon: SearchX, tone: "slate" },
  refused: { icon: Ban, tone: "red" },
  out_of_scope: { icon: CircleSlash, tone: "slate" },
};

export function AnswerTypeBadge({ type }: { type: AnswerType }) {
  const t = useT();
  const meta = ANSWER_META[type] ?? ANSWER_META.answered;
  const Icon = meta.icon;
  return (
    <span className={`badge badge--${meta.tone}`}>
      <Icon size={14} aria-hidden="true" />
      {t(`at_${type}` as const)}
    </span>
  );
}

const VERDICT_META: Record<Verdict, { icon: LucideIcon; tone: string }> = {
  appears_eligible: { icon: CircleCheck, tone: "green" },
  not_eligible: { icon: CircleX, tone: "red" },
  need_more_information: { icon: CircleAlert, tone: "amber" },
  verify_with_officer: { icon: ShieldQuestion, tone: "violet" },
};

export function VerdictChip({ verdict, size = "md" }: { verdict: Verdict; size?: "sm" | "md" }) {
  const t = useT();
  const meta = VERDICT_META[verdict] ?? VERDICT_META.need_more_information;
  const Icon = meta.icon;
  return (
    <span className={`chip chip--${meta.tone} chip--${size}`}>
      <Icon size={size === "sm" ? 14 : 16} aria-hidden="true" />
      {t(`v_${verdict}` as const)}
    </span>
  );
}

export function verdictTone(v: Verdict): string {
  return (VERDICT_META[v] ?? VERDICT_META.need_more_information).tone;
}

export function StatusChip({ status }: { status: string }) {
  const t = useT();
  const tone = status === "open" ? "green" : status === "upcoming" ? "blue" : status === "closed" ? "red" : "slate";
  const key = status === "open" || status === "closed" || status === "upcoming" ? (`status_${status}` as const) : null;
  return (
    <span className={`chip chip--${tone} chip--sm chip--dot`}>
      <span className="dot" aria-hidden="true" />
      {key ? t(key) : status}
    </span>
  );
}