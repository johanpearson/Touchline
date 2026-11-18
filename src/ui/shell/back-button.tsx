import { ArrowLeft } from "lucide-react";
import type { MessageKey } from "../../i18n";
import { cn } from "../components";
import { buttonStyles } from "../components/button-styles";
import { useI18n } from "../i18n-provider";
import { hrefFor, type Route } from "../routes";
import { useBackTarget } from "./back-target";

/** The screen name used in "Back to <screen>" for each route. */
const SCREEN_NAMES: Record<Route["name"], MessageKey> = {
  home: "nav.hub",
  league: "nav.league",
  club: "back.screen.club",
  player: "back.screen.player",
  match: "nav.match",
  results: "back.screen.results",
  "season-end": "back.screen.seasonEnd",
  "off-season": "back.screen.offSeason",
  saves: "nav.saves",
  settings: "nav.settings",
  squad: "nav.squad",
  tactics: "nav.tactics",
  market: "nav.market",
  new: "back.screen.new",
  "new-club": "back.screen.new",
  "not-found": "nav.hub",
};

/** `hasCareer` decides whether home is called "Home" or "Start". */
function useBackLabel(target: Route, hasCareer: boolean): string {
  const { t } = useI18n();
  if (target.name === "home" && !hasCareer) return t("back.to", { screen: t("back.screen.start") });
  return t("back.to", { screen: t(SCREEN_NAMES[target.name]) });
}

/** An icon link to the parent screen; renders nothing on the root. It never leaves the app. */
export function BackButton({ hasCareer }: { hasCareer: boolean }) {
  const target = useBackTarget();
  if (!target || target.name === "not-found") return null;
  return <BackLink target={target} hasCareer={hasCareer} />;
}

function BackLink({ target, hasCareer }: { target: Route; hasCareer: boolean }) {
  const label = useBackLabel(target, hasCareer);
  return (
    <a
      data-testid="back-button"
      href={hrefFor(target as Exclude<Route, { name: "not-found" }>)}
      aria-label={label}
      title={label}
      className={cn(buttonStyles({ variant: "ghost" }), "size-11 shrink-0 px-0")}
    >
      <ArrowLeft aria-hidden="true" className="size-5" />
    </a>
  );
}
