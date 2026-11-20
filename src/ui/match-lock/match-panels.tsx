import { Drawer } from "../components";
import { useI18n } from "../i18n-provider";
import { SquadScreen } from "../squad-screen";
import { useCareer } from "../use-career";
import { MatchLineupView } from "./match-lineup-view";
import { useMatchLock } from "./match-lock";

/**
 * Squad and tactics over the match: a side drawer on desktop, a full-height sheet on phones. The
 * content is read only. Escape and the close button close it and focus goes back to where it was.
 */
export function MatchPanels() {
  const { t } = useI18n();
  const { career } = useCareer();
  const { panel, closePanel } = useMatchLock();
  if (!career || !panel) return null;
  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) closePanel();
      }}
      title={t(panel === "squad" ? "nav.squad" : "tactics.title")}
      description={t("match.lock.readOnly")}
      closeLabel={t("match.close")}
      side="left"
      className="sm:w-[min(48rem,100vw)] max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none"
    >
      <div data-testid={`match-panel-${panel}`}>
        {panel === "squad" ? (
          <SquadScreen career={career} readOnly />
        ) : (
          <MatchLineupView career={career} />
        )}
      </div>
    </Drawer>
  );
}
