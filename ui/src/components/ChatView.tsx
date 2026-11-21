import { useEffect, useRef } from "react";
import { CalendarCheck, FileText, ListChecks, RotateCcw, X } from "lucide-react";
import { useSession } from "../state/session";
import { useChat } from "../state/chat";
import { formatDate } from "../lib/format";
import { AssistantCard, UserBubble } from "./MessageCard";
import { Logo, Notice } from "./common";

const STARTERS: { text: string; lang: string; tag: string }[] = [
  { text: "मेरे पास 2 एकड़ ज़मीन है और मैं खेती करता हूँ। मुझे कौन सी योजनाएँ मिल सकती हैं?", lang: "hi", tag: "हि" },
  {
    text: "My mother is 67 and our family income is ₹1.2 lakh a year. Can she get the old-age pension?",
    lang: "en",
    tag: "EN",
  },
  { text: "Kisan Samriddhi Yojana ke liye kaun se documents lagenge?", lang: "hi-Latn", tag: "Hinglish" },
  { text: "ನನ್ನ ತಾಯಿಗೆ 67 ವರ್ಷ ವಯಸ್ಸು. ಅವರಿಗೆ ವೃದ್ಧಾಪ್ಯ ಪಿಂಚಣಿ ಸಿಗಬಹುದೇ?", lang: "kn", tag: "ಕ" },
  { text: "என் அம்மாவுக்கு 67 வயது. அவருக்கு முதியோர் உதவித்தொகை கிடைக்குமா?", lang: "ta", tag: "த" },
  { text: "Is the girls' scholarship still open? What is the last date?", lang: "en", tag: "EN" },
  { text: "Book me a slot at the nearest service centre this Saturday and remind me the day before.", lang: "en", tag: "EN" },
  { text: "A man says I must pay ₹500 to release my scheme money. Should I pay?", lang: "en", tag: "EN" },
];

function EmptyState() {
  const { t } = useSession();
  const { send, pending } = useChat();
  const points = [
    { icon: ListChecks, text: t("canDo1") },
    { icon: FileText, text: t("canDo2") },
    { icon: CalendarCheck, text: t("canDo3") },
  ];
  return (
    <div className="empty-state">
      <div className="empty-hero">
        <Logo size={56} />
        <h1>{t("greetingTitle")}</h1>
        <p className="empty-lead">{t("greetingBody")}</p>
      </div>
      <ul className="can-do">
        {points.map(({ icon: Icon, text }) => (
          <li key={text}>
            <span className="can-do-icon">
              <Icon size={18} aria-hidden="true" />
            </span>
            {text}
          </li>
        ))}
      </ul>
      <h2 className="starter-title">{t("tryAsking")}</h2>
      <ul className="starters">
        {STARTERS.map((s) => (
          <li key={s.text}>
            <button type="button" className="starter" disabled={pending} onClick={() => send(s.text)}>
              <span className="starter-tag">{s.tag}</span>
              <span className="starter-text" lang={s.lang}>
                {s.text}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TypingIndicator() {
  const { t } = useSession();
  return (
    <div className="msg msg--assistant" aria-live="polite">
      <div className="msg-avatar" aria-hidden="true">
        <Logo size={30} />
      </div>
      <div className="typing">
        <span className="typing-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="typing-label">{t("thinking")}</span>
      </div>
    </div>
  );
}

export function ChatView() {
  const { t, state, dispatch } = useSession();
  const { pending, error, retry, dismissError } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<HTMLDivElement>(null);
  const messages = state.messages;
  const last = messages[messages.length - 1];
  const noConsent = state.identity.citizen_id !== "guest" && state.identity.consent_given === "N";

  // New user message / typing: stick to the bottom. New assistant card: show its top.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (messages.length === 0 && !pending) {
      scroller.scrollTop = 0;
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
    if (last?.role === "assistant" && !pending && lastRef.current) {
      const top = lastRef.current.offsetTop - 16;
      scroller.scrollTo({ top, behavior });
    } else {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior });
    }
  }, [messages.length, pending, last?.role]);

  return (
    <div className="chat-scroll" ref={scrollRef}>
      <div className="chat-inner">
        {(noConsent || state.asOfDate) && (
          <div className="chat-banners">
            {noConsent && (
              <Notice tone="warn">
                {t("consentBanner", { id: state.identity.citizen_id })}
              </Notice>
            )}
            {state.asOfDate && (
              <div className="asof-chip">
                {t("testingAsOf", { date: formatDate(state.asOfDate, state.language === "auto" ? "en" : state.language) })}
                <button
                  type="button"
                  className="icon-btn icon-btn--xs"
                  aria-label={t("resetToday")}
                  title={t("resetToday")}
                  onClick={() => dispatch({ type: "setAsOfDate", date: null })}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        {messages.length === 0 && !pending ? (
          <EmptyState />
        ) : (
          <div className="messages" role="log" aria-live="polite" aria-relevant="additions">
            {messages.map((m, i) => (
              <div key={m.id} ref={i === messages.length - 1 ? lastRef : undefined} className="msg-enter">
                {m.role === "user" ? (
                  <UserBubble message={m} />
                ) : (
                  <AssistantCard message={m} isLatest={i === messages.length - 1} />
                )}
              </div>
            ))}
            {pending && <TypingIndicator />}
          </div>
        )}

        {error && (
          <div className="chat-error">
            <Notice
              tone="error"
              action={
                <>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={retry}>
                    <RotateCcw size={16} aria-hidden="true" /> {t("retry")}
                  </button>
                  <button type="button" className="icon-btn" aria-label={t("dismiss")} onClick={dismissError}>
                    <X size={18} aria-hidden="true" />
                  </button>
                </>
              }
            >
              <strong>{t("errorBanner")}</strong> <span className="muted">{error.message}</span>
            </Notice>
          </div>
        )}
      </div>
    </div>
  );
}
