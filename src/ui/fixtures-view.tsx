import { useState } from "react";
import type { Career } from "../game";
import { useI18n } from "./i18n-provider";
import { ClubChip } from "./league-table";

export function FixturesView({ career }: { career: Career }) {
  const { t, formatNumber } = useI18n();
  const { fixtures, results, currentMatchday } = career.season;
  const lastMatchday = fixtures.reduce((max, f) => Math.max(max, f.matchday), 1);
  const [selected, setSelected] = useState(() => Math.min(currentMatchday, lastMatchday));
  const clubs = new Map(career.league.clubs.map((club) => [club.id, club]));
  const resultByFixture = new Map(results.map((r) => [r.fixtureId, r]));
  const shown = fixtures.filter((f) => f.matchday === selected);
  const matchdays = Array.from({ length: lastMatchday }, (_, i) => i + 1);

  return (
    <div data-testid="fixtures-view">
      <div className="matchday-picker">
        <button
          type="button"
          data-testid="matchday-previous"
          disabled={selected <= 1}
          onClick={() => setSelected(selected - 1)}
        >
          {t("fixtures.previous")}
        </button>
        <select
          data-testid="matchday-select"
          aria-label={t("fixtures.select")}
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
        >
          {matchdays.map((md) => (
            <option key={md} value={md}>
              {t("fixtures.matchday", { matchday: md })}
            </option>
          ))}
        </select>
        <button
          type="button"
          data-testid="matchday-next"
          disabled={selected >= lastMatchday}
          onClick={() => setSelected(selected + 1)}
        >
          {t("fixtures.next")}
        </button>
      </div>
      <h3>{t("fixtures.matchday", { matchday: selected })}</h3>
      <ul className="fixture-list">
        {shown.map((fixture) => {
          const home = clubs.get(fixture.homeClubId);
          const away = clubs.get(fixture.awayClubId);
          const result = resultByFixture.get(fixture.id);
          const isUser =
            fixture.homeClubId === career.userClubId || fixture.awayClubId === career.userClubId;
          if (!home || !away) return null;
          return (
            <li
              key={fixture.id}
              data-testid={`fixture-${fixture.id}`}
              aria-current={isUser ? "true" : undefined}
              className={isUser ? "user-fixture" : undefined}
            >
              <span className="fixture-home">
                <ClubChip club={home} /> {home.name}
              </span>
              <span
                className="fixture-score"
                data-testid={`fixture-score-${fixture.id}`}
                title={result ? undefined : t("fixtures.notPlayed")}
              >
                {result
                  ? `${formatNumber(result.homeGoals, 0)}–${formatNumber(result.awayGoals, 0)}`
                  : "–"}
              </span>
              <span className="fixture-away">
                {away.name} <ClubChip club={away} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
