// Session state: who is asking, in which language, as of which date, and the current
// conversation. Persisted to localStorage so a refresh keeps the chat.
import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import type { AnswerType, AskResponse, DemoCitizen, Lang, PendingAction } from "../types";
import { makeT, type Translate, type UiLanguage } from "../i18n";
import { loadJSON, saveJSON } from "../lib/storage";

export interface Identity {
  citizen_id: string; // "guest" for anonymous
  district?: string;
  residence_type?: string;
  preferred_language?: string;
  consent_given?: string;
}

export const GUEST: Identity = { citizen_id: "guest" };

export type ActionPhase = "pending" | "confirming" | "cancelling" | "executed" | "cancelled" | "error";
export type ActionErrorKind = "already" | "expired" | "forbidden" | "notfound" | "other";

export interface ActionState {
  phase: ActionPhase;
  result?: Record<string, unknown>;
  verified?: boolean;
  error?: string;
  errorKind?: ActionErrorKind;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  answerType?: AnswerType;
  language?: Lang;
  traceId?: string;
  /** Full /ask payload for assistant turns. */
  response?: AskResponse;
  /** Lifecycle of response.pending_action, if any. */
  actionState?: ActionState;
  /** For the assistant message created from a confirm call. */
  actionResult?: { action: PendingAction; result: Record<string, unknown>; verified: boolean };
}

export interface SessionState {
  identity: Identity;
  language: UiLanguage;
  /** null = today */
  asOfDate: string | null;
  conversationId: string | null;
  messages: ChatMessage[];
}

type Action =
  | { type: "setIdentity"; identity: Identity }
  | { type: "setLanguage"; language: UiLanguage }
  | { type: "setAsOfDate"; date: string | null }
  | { type: "newConversation" }
  | { type: "addMessage"; message: ChatMessage }
  | { type: "setConversationId"; id: string }
  | { type: "updateAction"; messageId: string; patch: Partial<ActionState> };

const STORAGE_KEY = "schemesathi.session.v1";

const initialState: SessionState = {
  identity: GUEST,
  language: "auto",
  asOfDate: null,
  conversationId: null,
  messages: [],
};

function loadInitial(): SessionState {
  const saved = loadJSON<Partial<SessionState>>(STORAGE_KEY);
  if (!saved || typeof saved !== "object") return initialState;
  const messages = Array.isArray(saved.messages) ? saved.messages : [];
  return {
    identity: saved.identity && typeof saved.identity.citizen_id === "string" ? saved.identity : GUEST,
    language: (["auto", "hi", "en", "kn", "ta"] as const).includes(saved.language as UiLanguage)
      ? (saved.language as UiLanguage)
      : "auto",
    asOfDate: typeof saved.asOfDate === "string" ? saved.asOfDate : null,
    conversationId: typeof saved.conversationId === "string" ? saved.conversationId : null,
    // A request that was in flight when the page closed can't be resumed.
    messages: messages.map((m) =>
      m.actionState && (m.actionState.phase === "confirming" || m.actionState.phase === "cancelling")
        ? { ...m, actionState: { phase: "pending" as const } }
        : m,
    ),
  };
}

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "setIdentity":
      if (action.identity.citizen_id === state.identity.citizen_id) return { ...state, identity: action.identity };
      // A conversation belongs to one citizen: switching identity starts a fresh one.
      return { ...state, identity: action.identity, conversationId: null, messages: [] };
    case "setLanguage":
      return { ...state, language: action.language };
    case "setAsOfDate":
      return { ...state, asOfDate: action.date };
    case "newConversation":
      return { ...state, conversationId: null, messages: [] };
    case "addMessage":
      return { ...state, messages: [...state.messages, action.message] };
    case "setConversationId":
      return { ...state, conversationId: action.id };
    case "updateAction":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId
            ? { ...m, actionState: { ...(m.actionState ?? { phase: "pending" }), ...action.patch } }
            : m,
        ),
      };
    default:
      return state;
  }
}

interface SessionContextValue {
  state: SessionState;
  dispatch: Dispatch<Action>;
  t: Translate;
  citizenId: string;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  useEffect(() => {
    saveJSON(STORAGE_KEY, state);
  }, [state]);

  useEffect(() => {
    const lang = state.language === "auto" ? "en" : state.language;
    document.documentElement.lang = lang;
  }, [state.language]);

  const value = useMemo<SessionContextValue>(
    () => ({ state, dispatch, t: makeT(state.language), citizenId: state.identity.citizen_id || "guest" }),
    [state],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

export function useT(): Translate {
  return useSession().t;
}

export function identityFromCitizen(c: DemoCitizen): Identity {
  return {
    citizen_id: c.citizen_id,
    district: c.district,
    residence_type: c.residence_type,
    preferred_language: c.preferred_language,
    consent_given: c.consent_given,
  };
}
