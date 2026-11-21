import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { SendHorizontal, SquarePen } from "lucide-react";
import { useSession } from "../state/session";
import { useChat } from "../state/chat";
import { useUI } from "../state/ui";

const MAX_HEIGHT = 200;

export function Composer() {
  const { t, state } = useSession();
  const { send, pending, newConversation } = useChat();
  const { draft, setDraft } = useUI();
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Pick up a pre-filled draft (e.g. "Ask about this scheme").
  useEffect(() => {
    if (!draft) return;
    setText(draft);
    setDraft("");
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, [draft, setDraft]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [text]);

  const submit = () => {
    const v = text.trim();
    if (!v || pending) return;
    send(v);
    setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't send while an IME (common for Indic keyboards) is composing.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="composer-wrap">
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="composer-input" className="sr-only">
          {t("composerLabel")}
        </label>
        <textarea
          id="composer-input"
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("composerPlaceholder")}
          dir="auto"
          maxLength={4000}
          aria-describedby="composer-hint"
        />
        <button
          type="submit"
          className="send-btn"
          disabled={pending || !text.trim()}
          aria-label={t("send")}
          title={t("send")}
        >
          <SendHorizontal size={20} aria-hidden="true" />
        </button>
      </form>
      <div className="composer-meta">
        <span id="composer-hint" className="composer-hint">
          {t("composerHint")}
        </span>
        {state.messages.length > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={newConversation}>
            <SquarePen size={16} aria-hidden="true" />
            {t("newConversation")}
          </button>
        )}
      </div>
    </div>
  );
}
