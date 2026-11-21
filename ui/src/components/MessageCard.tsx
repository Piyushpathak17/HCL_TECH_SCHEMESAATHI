import { Languages, ScanSearch, ShieldCheck, UserRound } from "lucide-react";
import type { ChatMessage } from "../state/session";
import { useT } from "../state/session";
import { useUI } from "../state/ui";
import { LANGUAGE_NAMES } from "../i18n";
import { formatTime, humanize } from "../lib/format";
import { AnswerTypeBadge } from "./Badges";
import { RichText } from "./RichText";
import { EligibilityList } from "./EligibilityCard";
import { CitationChips } from "./CitationChips";
import { QuestionsBlock } from "./QuestionBlock";
import { ActionCard } from "./ActionCard";
import { ReferralCard } from "./ReferralCard";
import { Logo } from "./common";

function groundTone(g: number): string {
  if (g >= 0.8) return "green";
  if (g >= 0.6) return "amber";
  return "red";
}

function MessageFooter({ message }: { message: ChatMessage }) {
  const t = useT();
  const { openAudit } = useUI();
  const res = message.response;
  const critic = res?.critic;
  const detected = res?.intent?.language ?? message.language;
  if (!critic && !detected && !message.traceId) return null;
  return (
    <footer className="msg-footer">
      {critic && (
        <span
          className={`meta-pill meta-pill--${groundTone(critic.groundedness)}`}
          title={`${humanize(critic.decision)} · coverage ${critic.coverage} · language ${critic.language_fidelity}`}
        >
          <ShieldCheck size={13} aria-hidden="true" />
          {t("grounded", { pct: Math.round(critic.groundedness * 100) })}
          <span className="meta-sep">·</span>
          {humanize(critic.decision)}
          {critic.revisions > 0 && (
            <>
              <span className="meta-sep">·</span>
              {t("revisions", { n: critic.revisions })}
            </>
          )}
        </span>
      )}
      {detected && (
        <span className="meta-pill">
          <Languages size={13} aria-hidden="true" />
          {t("detected", { lang: LANGUAGE_NAMES[detected] ?? detected })}
        </span>
      )}
      {message.traceId && (
        <button type="button" className="meta-link" onClick={() => openAudit(message.traceId!)}>
          <ScanSearch size={13} aria-hidden="true" />
          {t("whyThisAnswer")}
        </button>
      )}
    </footer>
  );
}

export function UserBubble({ message }: { message: ChatMessage }) {
  const t = useT();
  return (
    <div className="msg msg--user">
      <div className="bubble" dir="auto">
        <span className="sr-only">{t("you")}: </span>
        {message.text}
      </div>
      <div className="msg-avatar msg-avatar--user" aria-hidden="true">
        <UserRound size={16} />
      </div>
    </div>
  );
}

export function AssistantCard({ message, isLatest }: { message: ChatMessage; isLatest: boolean }) {
  const t = useT();
  const res = message.response;
  const lang = message.language === "hinglish" ? "hi-Latn" : message.language;
  const verdictLang = message.language === "hinglish" ? "hi" : (message.language ?? "en");
  const answerType = message.answerType ?? res?.answer_type ?? "answered";

  return (
    <div className="msg msg--assistant">
      <div className="msg-avatar" aria-hidden="true">
        <Logo size={30} />
      </div>
      <article className="answer-card" aria-label={t("assistant")}>
        <header className="answer-head">
          <AnswerTypeBadge type={answerType} />
          <time className="msg-time" dateTime={message.createdAt}>
            {formatTime(new Date(message.createdAt), message.language)}
          </time>
        </header>

        <RichText text={message.text} lang={lang} />

        {res && res.eligibility?.length > 0 && <EligibilityList items={res.eligibility} lang={verdictLang} />}

        {res && answerType === "clarification_needed" && res.questions?.length > 0 && (
          <QuestionsBlock questions={res.questions} lang={lang} interactive={isLatest} />
        )}

        {res?.pending_action && message.actionState && (
          <ActionCard messageId={message.id} action={res.pending_action} state={message.actionState} lang={lang} />
        )}

        {res && (answerType === "referred" || res.referral_id) && (
          <ReferralCard referralId={res.referral_id} referral={res.referral} />
        )}

        {res && res.citations?.length > 0 && <CitationChips citations={res.citations} />}

        <MessageFooter message={message} />
      </article>
    </div>
  );
}
