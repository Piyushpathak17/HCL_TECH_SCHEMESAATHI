import { CircleHelp } from "lucide-react";
import type { Question, ReplyLang } from "../types";
import { hasKey } from "../i18n";
import { useT } from "../state/session";
import { useChat } from "../state/chat";
import { QUICK_REPLIES } from "../lib/attributes";

interface Props {
  questions: Question[];
  lang?: string;
  /** Only the latest message offers quick replies. */
  interactive: boolean;
}

export function QuestionsBlock({ questions, lang, interactive }: Props) {
  const t = useT();
  const { send, pending } = useChat();
  if (!questions.length) return null;
  const replyLang = (["hi", "en", "kn", "ta"] as const).includes(lang as ReplyLang) ? (lang as ReplyLang) : undefined;

  return (
    <section className="questions" aria-label={t("questionsTitle")}>
      <div className="questions-title">
        <CircleHelp size={16} aria-hidden="true" /> {t("questionsTitle")}
      </div>
      <ol className="question-list">
        {questions.map((q, i) => {
          const options = QUICK_REPLIES[q.attribute];
          return (
            <li key={`${q.attribute}-${i}`} className="question">
              <p className="question-text" lang={lang}>
                {q.text}
              </p>
              {q.reason && (
                <p className="question-reason" lang={lang}>
                  <span className="muted">{t("whyAsking")}</span> {q.reason}
                </p>
              )}
              {interactive && options && (
                <div className="quick-replies">
                  {options.map((o) => (
                    <button
                      key={o.send}
                      type="button"
                      className="quick-reply"
                      disabled={pending}
                      onClick={() => send(o.send, { language: replyLang })}
                    >
                      {hasKey(o.label) ? t(o.label) : o.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {interactive && <p className="questions-hint muted small">{t("questionsHint")}</p>}
    </section>
  );
}
