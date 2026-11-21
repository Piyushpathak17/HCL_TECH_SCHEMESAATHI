import { SessionProvider } from "./state/session";
import { UIProvider, useUI } from "./state/ui";
import { ChatProvider } from "./state/chat";
import { AppShell } from "./components/Appshell";
import { AskPage } from "./pages/AskPage";
import { EligibilityPage } from "./pages/EligibilityPage";
import { SchemesPage } from "./pages/SchemesPage";
import { SourcesPage } from "./pages/SourcesPage";
import { AdminPage } from "./pages/AdminPage";

function CurrentPage() {
  const { tab } = useUI();
  switch (tab) {
    case "eligibility":
      return <EligibilityPage />;
    case "schemes":
      return <SchemesPage />;
    case "sources":
      return <SourcesPage />;
    case "admin":
      return <AdminPage />;
    default:
      return <AskPage />;
  }
}

export default function App() {
  return (
    <SessionProvider>
      <UIProvider>
        <ChatProvider>
          <AppShell>
            <CurrentPage />
          </AppShell>
        </ChatProvider>
      </UIProvider>
    </SessionProvider>
  );
}

