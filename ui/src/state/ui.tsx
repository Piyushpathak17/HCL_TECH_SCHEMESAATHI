// Transient UI state: which tab is open (synced to the URL hash), which drawer is open,
// and a composer draft other pages can pre-fill ("Ask about this scheme").
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Tab = "ask" | "eligibility" | "schemes" | "sources" | "admin";
export const TABS: Tab[] = ["ask", "eligibility", "schemes", "sources", "admin"];

export type DrawerState =
  | { kind: "source"; sourceId: string; section?: string }
  | { kind: "audit"; traceId: string }
  | { kind: "referral"; referralId: string }
  | null;

interface UIContextValue {
  tab: Tab;
  setTab: (t: Tab) => void;
  drawer: DrawerState;
  openSource: (sourceId: string, section?: string) => void;
  openAudit: (traceId: string) => void;
  openReferral: (referralId: string) => void;
  closeDrawer: () => void;
  draft: string;
  setDraft: (s: string) => void;
  /** Switch to Ask with this text in the composer. */
  prefillAsk: (s: string) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

function tabFromHash(): Tab {
  const h = window.location.hash.replace(/^#\/?/, "") as Tab;
  return TABS.includes(h) ? h : "ask";
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
  }, []);

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    if (window.location.hash !== `#/${t}`) {
      try {
        window.history.pushState(null, "", `#/${t}`);
      } catch {
        window.location.hash = `#/${t}`;
      }
    }
  }, []);

  const value = useMemo<UIContextValue>(
    () => ({
      tab,
      setTab,
      drawer,
      openSource: (sourceId, section) => setDrawer({ kind: "source", sourceId, section }),
      openAudit: (traceId) => setDrawer({ kind: "audit", traceId }),
      openReferral: (referralId) => setDrawer({ kind: "referral", referralId }),
      closeDrawer: () => setDrawer(null),
      draft,
      setDraft,
      prefillAsk: (s) => {
        setDraft(s);
        setTab("ask");
      },
    }),
    [tab, setTab, drawer, draft],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside UIProvider");
  return ctx;
}
