// Chat runtime: sending messages, retrying, and confirming / cancelling proposed actions.
// Lives above the pages so an answer still lands if the user switches tabs while waiting.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError, errorMessage } from "../api";
import { uid } from "../lib/format";
import type { ReplyLang } from "../types";
import { useSession, type ActionErrorKind, type ActionState, type ChatMessage } from "./session";

interface ChatError {
  message: string;
  /** The text to resend on retry. */
  text: string;
  language?: ReplyLang;
}

interface ChatContextValue {
  pending: boolean;
  error: ChatError | null;
  /** `language` overrides the reply language for this one turn (used by quick replies). */
  send: (text: string, opts?: { language?: ReplyLang }) => void;
  retry: () => void;
  dismissError: () => void;
  confirmAction: (messageId: string) => void;
  cancelAction: (messageId: string) => void;
  newConversation: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function classifyActionError(err: unknown): ActionErrorKind {
  if (!(err instanceof ApiError)) return "other";
  if (err.status === 409) return "already";
  if (err.status === 410) return "expired";
  if (err.status === 403) return "forbidden";
  if (err.status === 404) return "notfound";
  return "other";
}

function actionErrorPatch(err: unknown): Partial<ActionState> {
  const kind = classifyActionError(err);
  const terminal = kind === "already" || kind === "expired" || kind === "notfound";
  return { phase: terminal ? "error" : "pending", errorKind: kind, error: errorMessage(err) };
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { state, dispatch, citizenId } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const abortRef = useRef<AbortController | null>(null);
  const pendingRef = useRef(false);

  const stopPending = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    pendingRef.current = false;
    setPending(false);
    setError(null);
  }, []);

  // Identity changes reset the conversation; drop any in-flight request with it.
  useEffect(() => stopPending, [citizenId, stopPending]);

  const ask = useCallback(
    async (text: string, addUserMessage: boolean, languageOverride?: ReplyLang) => {
      const trimmed = text.trim();
      if (!trimmed || pendingRef.current) return;
      const s = stateRef.current;
      if (addUserMessage) {
        dispatch({
          type: "addMessage",
          message: { id: uid("u"), role: "user", text: trimmed, createdAt: new Date().toISOString() },
        });
      }
      setError(null);
      setPending(true);
      pendingRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await api.ask(
          s.identity.citizen_id || "guest",
          {
            message: trimmed,
            conversation_id: s.conversationId ?? undefined,
            channel: "web",
            language: s.language === "auto" ? languageOverride : s.language,
            as_of_date: s.asOfDate ?? undefined,
          },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        dispatch({ type: "setConversationId", id: res.conversation_id });
        const msg: ChatMessage = {
          id: uid("a"),
          role: "assistant",
          text: res.answer,
          createdAt: new Date().toISOString(),
          answerType: res.answer_type,
          language: res.language,
          traceId: res.trace_id,
          response: res,
        };
        if (res.pending_action) {
          const st = res.pending_action.status;
          msg.actionState = { phase: st === "executed" ? "executed" : st === "cancelled" ? "cancelled" : "pending" };
        }
        dispatch({ type: "addMessage", message: msg });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (controller.signal.aborted) return;
        setError({ message: errorMessage(err), text: trimmed, language: languageOverride });
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          pendingRef.current = false;
          setPending(false);
        }
      }
    },
    [dispatch],
  );

  const findMessage = (id: string) => stateRef.current.messages.find((m) => m.id === id);

  const confirmAction = useCallback(
    async (messageId: string) => {
      const msg = findMessage(messageId);
      const action = msg?.response?.pending_action;
      if (!msg || !action) return;
      dispatch({ type: "updateAction", messageId, patch: { phase: "confirming", error: undefined, errorKind: undefined } });
      try {
        const res = await api.confirmAction(stateRef.current.identity.citizen_id || "guest", action.action_id);
        dispatch({ type: "updateAction", messageId, patch: { phase: "executed", result: res.result, verified: res.verified } });
        dispatch({
          type: "addMessage",
          message: {
            id: uid("a"),
            role: "assistant",
            text: res.answer,
            createdAt: new Date().toISOString(),
            answerType: res.answer_type ?? "action_completed",
            language: res.language,
            traceId: res.trace_id,
            actionResult: { action: res.action, result: res.result ?? {}, verified: !!res.verified },
          },
        });
      } catch (err) {
        dispatch({ type: "updateAction", messageId, patch: actionErrorPatch(err) });
      }
    },
    [dispatch],
  );

  const cancelAction = useCallback(
    async (messageId: string) => {
      const msg = findMessage(messageId);
      const action = msg?.response?.pending_action;
      if (!msg || !action) return;
      dispatch({ type: "updateAction", messageId, patch: { phase: "cancelling", error: undefined, errorKind: undefined } });
      try {
        const res = await api.cancelAction(stateRef.current.identity.citizen_id || "guest", action.action_id);
        dispatch({ type: "updateAction", messageId, patch: { phase: "cancelled" } });
        if (res.answer) {
          dispatch({
            type: "addMessage",
            message: {
              id: uid("a"),
              role: "assistant",
              text: res.answer,
              createdAt: new Date().toISOString(),
              answerType: res.answer_type ?? "answered",
              language: res.language,
              traceId: res.trace_id,
            },
          });
        }
      } catch (err) {
        dispatch({ type: "updateAction", messageId, patch: actionErrorPatch(err) });
      }
    },
    [dispatch],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      pending,
      error,
      send: (text, opts) => void ask(text, true, opts?.language),
      retry: () => {
        if (error) void ask(error.text, false, error.language);
      },
      dismissError: () => setError(null),
      confirmAction: (id) => void confirmAction(id),
      cancelAction: (id) => void cancelAction(id),
      newConversation: () => {
        stopPending();
        dispatch({ type: "newConversation" });
      },
    }),
    [pending, error, ask, confirmAction, cancelAction, dispatch, stopPending],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
}
