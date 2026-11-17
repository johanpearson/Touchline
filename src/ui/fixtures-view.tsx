import { useMemo, useState } from "react";
import type { Career } from "../game";
import { FixtureRow } from "./fixture-row";
import { defaultRound } from "./fixtures-logic";
import { roundCount } from "./hub-data";
import { useI18n } from "./i18n-provider";
import { RoundPicker } from "./round-picker";

/** The fixtures of one round, picked with previous and next or a select; the current round first. */
export function FixturesView({ career }: { career: Career }) {
  const { t, formatNumber } = useI18n();
  const { fixtures, results } = career.season;
  const total = roundCount(career.season);
  const [round, setRound] = useState(() => defaultRound(career.season));
  const clubs = useMemo(() => new Map(career.league.clubs.map((c) => [c.id, c])), [career]);
  const players = useMemo(() => new Map(career.league.players.map((p) => [p.id, p])), [career]);
  const resultByFixture = new Map(results.map((r) => [r.fixtureId, r]));
  const shown = fixtures.filter((f) => f.matchday === round);
  return (
    <div data-testid="fixtures-view" className="flex flex-col gap-4">
      <RoundPicker round={round} total={total} onChange={setRound} />
      <h3 className="m-0 font-heading text-xl text-text">
        {t("fixtures.round", { matchday: formatNumber(round, 0), total: formatNumber(total, 0) })}
      </h3>
      <ul
        aria-label={t("fixtures.list", { matchday: formatNumber(round, 0) })}
        className="m-0 flex list-none flex-col gap-2 p-0"
      >
        {shown.map((fixture) => {
          const home = clubs.get(fixture.homeClubId);
          const away = clubs.get(fixture.awayClubId);
          return home && away ? (
            <FixtureRow
              key={fixture.id}
              fixture={fixture}
              home={home}
              away={away}
              result={resultByFixture.get(fixture.id)}
              players={players}
              userClubId={career.userClubId}
            />
          ) : null;
        })}
      </ul>
    </div>
  );
}
