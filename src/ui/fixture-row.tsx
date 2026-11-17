import { ChevronDown } from "lucide-react";
import { type CSSProperties, useId, useState } from "react";
import type { Club, Fixture, Player, Result } from "../game";
import { cn } from "./components";
import { scorersOf } from "./fixtures-logic";
import { useI18n } from "./i18n-provider";
import { ClubCrest } from "./shell/club-crest";

type Props = {
  fixture: Fixture;
  home: Club;
  away: Club;
  result: Result | undefined;
  players: ReadonlyMap<string, Player>;
  userClubId: string;
};

// Written out in full so Tailwind finds the class.
const EDGE = "shadow-[inset_4px_0_0_var(--row-accent,var(--accent))]";

function Side({ club, align }: { club: Club; align: "start" | "end" }) {
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-2",
        align === "end" ? "flex-row-reverse text-right" : "text-left",
      )}
    >
      <ClubCrest shortName={club.shortName} colours={club.colours} size={24} />
      <span className="min-w-0 break-words text-text">{club.name}</span>
    </span>
  );
}

function ScorerList({ names, align }: { names: string[]; align: "start" | "end" }) {
  return (
    <ul
      className={cn(
        "m-0 flex list-none flex-col gap-0.5 p-0 text-sm text-soft",
        align === "end" ? "text-right" : "text-left",
      )}
    >
      {names.map((name, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a player can score twice, the order is fixed
        <li key={index}>{name}</li>
      ))}
    </ul>
  );
}

function Scorers({
  id,
  result,
  home,
  players,
}: {
  id: string;
  result: Result;
  home: Club;
  players: ReadonlyMap<string, Player>;
}) {
  const { t } = useI18n();
  const scorers = scorersOf(result, home, players);
  const recorded = scorers.home.length + scorers.away.length > 0;
  return (
    <div id={id} data-testid={`fixture-scorers-${result.fixtureId}`} className="px-3 pb-3">
      {recorded ? (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2">
          <ScorerList names={scorers.home} align="end" />
          <span className="w-12" aria-hidden="true" />
          <ScorerList names={scorers.away} align="start" />
        </div>
      ) : (
        <p className="m-0 text-center text-sm text-muted">{t("fixtures.scorers.none")}</p>
      )}
    </div>
  );
}

/** One match: both crests and names, the score or a dash, and the scorers on expand when it was played. */
export function FixtureRow({ fixture, home, away, result, players, userClubId }: Props) {
  const { t, formatNumber } = useI18n();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const mine = fixture.homeClubId === userClubId || fixture.awayClubId === userClubId;
  const hasGoals = result !== undefined && result.homeGoals + result.awayGoals > 0;
  const user = mine ? (fixture.homeClubId === userClubId ? home : away) : undefined;
  return (
    <li
      data-testid={`fixture-${fixture.id}`}
      data-highlighted={mine ? "true" : undefined}
      style={user ? ({ "--row-accent": user.colours.primary } as CSSProperties) : undefined}
      className={cn("rounded-lg border border-line", mine ? cn("bg-glow", EDGE) : "bg-surface")}
    >
      <div className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2">
        <Side club={home} align="end" />
        <span
          className="min-w-12 text-center font-heading text-xl text-text tabular-nums"
          data-testid={`fixture-score-${fixture.id}`}
          title={result ? undefined : t("fixtures.notPlayed")}
        >
          {result
            ? `${formatNumber(result.homeGoals, 0)}–${formatNumber(result.awayGoals, 0)}`
            : "–"}
        </span>
        <Side club={away} align="start" />
      </div>
      {mine ? <p className="sr-only">{t("fixtures.you")}</p> : null}
      {result ? (
        <>
          {hasGoals ? (
            <button
              type="button"
              data-testid={`fixture-toggle-${fixture.id}`}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen(!open)}
              className="mx-auto mb-2 flex min-h-11 cursor-pointer items-center gap-1 rounded-sm border-0 bg-transparent px-3 text-sm text-info focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {open ? t("fixtures.scorers.hide") : t("fixtures.scorers.show")}
              <ChevronDown aria-hidden="true" className={cn("size-4", open && "rotate-180")} />
            </button>
          ) : null}
          {open && hasGoals ? (
            <Scorers id={panelId} result={result} home={home} players={players} />
          ) : null}
        </>
      ) : null}
    </li>
  );
}
