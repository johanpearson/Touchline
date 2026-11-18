import type { Career } from "../../game";
import { Button, cn } from "../components";
import { useI18n } from "../i18n-provider";
import { PaletteButton } from "../palette/palette-button";
import { hrefFor } from "../routes";
import { SaveStatus } from "../save-status";
import { useCareer } from "../use-career";
import { Brand } from "./brand";
import { ClubCrest } from "./club-crest";
import { headerActionFor } from "./header-action";

function ClubIdentity({ career }: { career: Career }) {
  const { t } = useI18n();
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  if (!club) return null;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ClubCrest shortName={club.shortName} colours={club.colours} size={40} />
      <div className="min-w-0">
        <p
          className="m-0 truncate font-heading text-xl font-semibold leading-tight text-text"
          data-testid="nav-club-name"
        >
          {club.name}
        </p>
        <p className="m-0 truncate text-[13px] text-muted">
          {t("shell.season", { league: career.league.name, season: career.season.number })}
          {" · "}
          <span data-testid="nav-progress">
            {t("nav.progress", {
              season: career.season.number,
              matchday: career.season.currentMatchday,
            })}
          </span>
        </p>
      </div>
    </div>
  );
}

const HEADER_LABELS = {
  continue: "save.continue",
  "season-complete": "hub.seasonComplete",
  "off-season": "offSeason.hub.open",
} as const;

function HeaderAction({ career }: { career: Career }) {
  const { t } = useI18n();
  const action = headerActionFor(career);
  if (!action) return null;
  return (
    <Button asChild variant="primary" className="shrink-0">
      <a data-testid="header-action" href={hrefFor(action.route)}>
        {t(HEADER_LABELS[action.kind])}
      </a>
    </Button>
  );
}

/** Club identity, season, save status and the primary next-match action. */
export function AppHeader({ showBrand }: { showBrand: boolean }) {
  const { career } = useCareer();
  if (!career) return null;
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line bg-bg px-4 py-3 sm:px-6",
      )}
    >
      {showBrand ? <Brand hidden /> : null}
      <ClubIdentity career={career} />
      <div className="flex shrink-0 items-center gap-3">
        <PaletteButton />
        <SaveStatus />
        <HeaderAction career={career} />
      </div>
    </header>
  );
}
