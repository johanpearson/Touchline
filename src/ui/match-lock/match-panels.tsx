import { useRef } from "react";
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
  const { panel, closePanel, restoreFocus } = useMatchLock();
  // The last panel stays rendered while the sheet plays its exit.
  const shown = useRef(panel);
  if (panel) shown.current = panel;
  const content = panel ?? shown.current;
  if (!career || !content) return null;
  return (
    <Drawer
      open={panel !== null}
      onOpenChange={(open) => {
        if (!open) closePanel();
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        restoreFocus();
      }}
      title={t(content === "squad" ? "nav.squad" : "tactics.title")}
      description={t("match.lock.readOnly")}
      closeLabel={t("match.close")}
      side="left"
      className="sm:w-[min(48rem,100vw)] max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none"
    >
      <div data-testid={`match-panel-${content}`}>
        {content === "squad" ? (
          <SquadScreen career={career} readOnly />
        ) : (
          <MatchLineupView career={career} />
        )}
      </div>
    </Drawer>
  );
}
