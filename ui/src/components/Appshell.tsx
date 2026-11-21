import type { ReactNode } from "react";
import { ClipboardCheck, LayoutGrid, Library, MessagesSquare, Settings, type LucideIcon } from "lucide-react";
import type { I18nKey } from "../i18n";
import { useSession } from "../state/session";
import { useChat } from "../state/chat";
import { useUI, type Tab } from "../state/ui";
import {TopBar} from "./TopBar";
import { DrawerHost } from "./DrawerHost";

const NAV: { tab: Tab; icon: LucideIcon; label: I18nKey; short?: I18nKey }[] = [
  { tab: "ask", icon: MessagesSquare, label: "navAsk", short: "navAskShort" },
  { tab: "eligibility", icon: ClipboardCheck, label: "navEligibility", short: "navEligibilityShort" },
  { tab: "schemes", icon: LayoutGrid, label: "navSchemes", short: "navSchemesShort" },
  { tab: "sources", icon: Library, label: "navSources", short: "navSourcesShort" },
  { tab: "admin", icon: Settings, label: "navAdmin", short: "navAdminShort" },
];

function Nav() {
  const { t } = useSession();
  const { tab, setTab } = useUI();
  const { pending } = useChat();
  return (
    <nav className="nav" aria-label={t("mainNav")}>
      <ul>
        {NAV.map(({ tab: id, icon: Icon, label, short }) => (
          <li key={id}>
            <a
              href={`#/${id}`}
              className={`nav-item ${tab === id ? "is-active" : ""}`}
              aria-current={tab === id ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                setTab(id);
              }}
            >
              <span className="nav-icon">
                <Icon size={20} aria-hidden="true" />
                {id === "ask" && pending && tab !== "ask" && <span className="nav-dot" aria-hidden="true" />}
              </span>
              <span className="nav-label nav-label--long">{t(label)}</span>
              <span className="nav-label nav-label--short">{t(short ?? label)}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { tab } = useUI();
  const { t } = useSession();
  return (
    <div className="app">
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        {t("skipToContent")}
      </a>
      <TopBar />
      <Nav />
      <main id="main" className={`main ${tab === "ask" ? "main--chat" : ""}`} tabIndex={-1}>
        {children}
      </main>
      <DrawerHost />
    </div>
  );
}
