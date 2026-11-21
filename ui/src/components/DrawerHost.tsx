import { useUI } from "../state/ui";
import { SourceDrawer } from "./SourceDrawer";
import { AuditDrawer } from "./AuditDrawer";
import { ReferralDrawer } from "./ReferralDrawer";

/** Renders whichever drawer is open; any component can open one via useUI(). */
export function DrawerHost() {
  const { drawer, closeDrawer } = useUI();
  if (!drawer) return null;
  switch (drawer.kind) {
    case "source":
      return (
        <SourceDrawer
          key={`${drawer.sourceId}|${drawer.section ?? ""}`}
          sourceId={drawer.sourceId}
          section={drawer.section}
          onClose={closeDrawer}
        />
      );
    case "audit":
      return <AuditDrawer key={drawer.traceId} traceId={drawer.traceId} onClose={closeDrawer} />;
    case "referral":
      return <ReferralDrawer key={drawer.referralId} referralId={drawer.referralId} onClose={closeDrawer} />;
  }
}
