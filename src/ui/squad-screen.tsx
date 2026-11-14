import { useState } from "react";
import type { Mentality, Pressing, TeamTactics, Tempo, Width } from "../engine";
import {
  type Career,
  deriveLineupProfile,
  FORMATION_SHAPE,
  FORMATIONS,
  type Formation,
  type LineupError,
  PHASE_RATINGS,
  type Player,
  type PlayerPosition,
} from "../game";
import type { MessageKey } from "../i18n";
import { useI18n } from "./i18n-provider";
import {
  DEFAULT_PLAN_SORT,
  firstDirection,
  LOW_FITNESS,
  PLAN_SORT_COLUMNS,
  type PlanRow,
  type PlanSort,
  type PlanSortColumn,
  planRows,
} from "./plan-rows";
import { useCareer } from "./use-career";

const LINE_ORDER: readonly PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];

const TACTIC_LEVELS = {
  mentality: ["defensive", "balanced", "attacking"],
  pressing: ["low", "medium", "high"],
  width: ["narrow", "normal", "wide"],
  tempo: ["slow", "normal", "fast"],
} as const satisfies { [K in keyof TeamTactics]: readonly TeamTactics[K][] };

type TacticName = keyof TeamTactics;
const TACTIC_NAMES = Object.keys(TACTIC_LEVELS) as TacticName[];

const ERROR_KEYS: Record<LineupError, MessageKey> = {
  "wrong-formation-shape": "squad.error.wrongFormationShape",
  "wrong-bench-size": "squad.error.wrongBenchSize",
  "bench-without-keeper": "squad.error.benchWithoutKeeper",
  "duplicate-player": "squad.error.duplicatePlayer",
  "unknown-player": "squad.error.unknownPlayer",
};

type PlanProps = { career: Career; players: readonly Player[] };

/** Starters ordered GK, DEF, MID, FWD (stable within a line), keeping the plan's order otherwise. */
const orderedStarters = (ids: readonly string[], byId: ReadonlyMap<string, Player>): string[] =>
  LINE_ORDER.flatMap((line) => ids.filter((id) => byId.get(id)?.position === line));

function PlayerSelect(props: {
  testId: string;
  label: string;
  value: string;
  position?: PlayerPosition;
  players: readonly Player[];
  used: ReadonlySet<string>;
  /** Players that must stay selectable (or not) beyond the "used elsewhere" rule. */
  locked?: (player: Player) => boolean;
  onChange: (id: string) => void;
}) {
  const { t } = useI18n();
  const candidates = props.players.filter(
    (p) => props.position === undefined || p.position === props.position,
  );
  return (
    <select
      data-testid={props.testId}
      data-position={props.position}
      aria-label={props.label}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    >
      {candidates.map((p) => (
        <option
          key={p.id}
          value={p.id}
          disabled={p.id !== props.value && (props.used.has(p.id) || (props.locked?.(p) ?? false))}
        >
          {`${p.name} (${t(`position.short.${p.position}`)})`}
        </option>
      ))}
    </select>
  );
}

function Ratings({ career, players }: PlanProps) {
  const { t, formatNumber } = useI18n();
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const profile = deriveLineupProfile(
    club?.name ?? "",
    players,
    career.squadPlan,
    career.condition,
  );
  return (
    <section>
      <h3>{t("squad.ratings")}</h3>
      <dl className="club-ratings" data-testid="plan-ratings">
        {PHASE_RATINGS.map((phase) => (
          <div key={phase}>
            <dt>{t(`rating.${phase}`)}</dt>
            <dd data-testid={`plan-rating-${phase}`}>{formatNumber(profile[phase] * 100, 0)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PlanTable({ career, players }: PlanProps) {
  const { t, formatNumber } = useI18n();
  const [sort, setSort] = useState<PlanSort>(DEFAULT_PLAN_SORT);
  const rows = planRows(players, career.squadPlan, career.condition, sort);
  const onSort = (column: PlanSortColumn) =>
    setSort((s) =>
      s.column === column
        ? { column, direction: s.direction === "asc" ? "desc" : "asc" }
        : { column, direction: firstDirection(column) },
    );
  return (
    <table className="squad-table" data-testid="plan-table">
      <thead>
        <tr>
          {PLAN_SORT_COLUMNS.map((column) => (
            <th
              key={column}
              scope="col"
              className={column === "name" || column === "status" ? undefined : "num"}
              aria-sort={
                sort.column === column
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <button
                type="button"
                data-testid={`plan-sort-${column}`}
                onClick={() => onSort(column)}
              >
                {t(`squad.col.${column}`)}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <PlanTableRow key={row.player.id} row={row} format={formatNumber} />
        ))}
      </tbody>
    </table>
  );
}

function PlanTableRow({
  row,
  format,
}: {
  row: PlanRow;
  format: (value: number, digits: number) => string;
}) {
  const { t } = useI18n();
  const { player } = row;
  const low = row.fitness < LOW_FITNESS;
  return (
    <tr
      data-testid={`plan-row-${player.id}`}
      data-position={player.position}
      className={row.status === "starter" ? "best-eleven" : undefined}
    >
      <td>{player.name}</td>
      <td className="num">{t(`position.short.${player.position}`)}</td>
      <td className="num">{format(row.overall, 1)}</td>
      <td className={low ? "num low-fitness" : "num"} data-testid={`plan-fitness-${player.id}`}>
        {low ? (
          <span
            role="img"
            aria-label={t("squad.lowFitness")}
            title={t("squad.lowFitness")}
            data-testid={`plan-low-fitness-${player.id}`}
          >
            ⚠{" "}
          </span>
        ) : null}
        {format(row.fitness, 0)}
        <meter
          min={0}
          max={100}
          low={LOW_FITNESS}
          optimum={100}
          value={row.fitness}
          aria-hidden="true"
        />
      </td>
      <td className="num" data-testid={`plan-form-${player.id}`}>
        {format(row.form, 0)}
      </td>
      <td data-testid={`plan-status-${player.id}`} data-status={row.status}>
        {t(`squad.status.${row.status}`)}
      </td>
    </tr>
  );
}

/** The user's lineup, bench and tactics editor with the derived team ratings. */
export function SquadScreen({ career }: { career: Career }) {
  const { t } = useI18n();
  const { setLineup, setTactics, autoPickLineup } = useCareer();
  const [error, setError] = useState<LineupError | null>(null);
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const ids = new Set(club?.playerIds);
  const players = career.league.players.filter((p) => ids.has(p.id));
  const byId = new Map(players.map((p) => [p.id, p]));
  const plan = career.squadPlan;
  const starterSet = new Set(plan.starters);
  const starters = orderedStarters(plan.starters, byId);
  const benchKeepers = plan.bench.filter((id) => byId.get(id)?.position === "GK");

  const edit = (next: { starters?: string[]; bench?: string[] }) => {
    const result = setLineup({
      formation: plan.formation,
      starters: next.starters ?? plan.starters,
      bench: next.bench ?? plan.bench,
    });
    setError(result.ok ? null : result.error);
  };
  const replace = (list: readonly string[], from: string, to: string) =>
    list.map((id) => (id === from ? to : id));
  /** Puts `to` in `from`'s place and, if `to` was in the list, `from` in `to`'s place. */
  const swap = (list: readonly string[], from: string, to: string) =>
    list.map((id) => (id === from ? to : id === to ? from : id));
  const benchSet = new Set(plan.bench);

  return (
    <section data-testid="squad-screen" className="club-screen">
      <h2>{t("squad.title")}</h2>
      {error ? (
        <p role="alert" data-testid="squad-error">
          {t(ERROR_KEYS[error])}
        </p>
      ) : null}
      <div className="squad-controls">
        <label>
          {t("squad.formation")}{" "}
          <select
            data-testid="formation"
            value={plan.formation}
            onChange={(e) => {
              autoPickLineup(e.target.value as Formation);
              setError(null);
            }}
          >
            {FORMATIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          data-testid="auto-pick"
          onClick={() => {
            autoPickLineup(plan.formation);
            setError(null);
          }}
        >
          {t("squad.autoPick")}
        </button>
      </div>
      <fieldset data-testid="tactics">
        <legend>{t("squad.tactics")}</legend>
        {TACTIC_NAMES.map((name) => (
          <label key={name}>
            {t(`squad.tactic.${name}`)}{" "}
            <select
              data-testid={`tactic-${name}`}
              value={plan.tactics[name]}
              onChange={(e) =>
                setTactics({
                  ...plan.tactics,
                  [name]: e.target.value as Mentality & Pressing & Width & Tempo,
                })
              }
            >
              {TACTIC_LEVELS[name].map((level) => (
                <option key={level} value={level}>
                  {t(`squad.level.${level}` as MessageKey)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>
      <h3>{t("squad.starters")}</h3>
      {LINE_ORDER.map((line) => (
        <div key={line} className="squad-line">
          <h4>
            {t(`position.${line}`)} ({FORMATION_SHAPE[plan.formation][line]})
          </h4>
          {starters
            .filter((id) => byId.get(id)?.position === line)
            .map((id) => (
              <PlayerSelect
                key={id}
                testId={`starter-${starters.indexOf(id)}`}
                label={t(`position.${line}`)}
                value={id}
                position={line}
                players={players}
                used={starterSet}
                onChange={(to) =>
                  edit(
                    benchSet.has(to)
                      ? {
                          starters: replace(plan.starters, id, to),
                          bench: replace(plan.bench, to, id),
                        }
                      : { starters: replace(plan.starters, id, to) },
                  )
                }
              />
            ))}
        </div>
      ))}
      <h3>{t("squad.bench")}</h3>
      <div className="squad-line">
        {plan.bench.map((id, i) => (
          <PlayerSelect
            key={id}
            testId={`bench-${i}`}
            label={t("squad.benchSlot", { slot: i + 1 })}
            value={id}
            players={players}
            used={starterSet}
            locked={(p) =>
              byId.get(id)?.position === "GK" && benchKeepers.length === 1 && p.position !== "GK"
            }
            onChange={(to) => edit({ bench: swap(plan.bench, id, to) })}
          />
        ))}
      </div>
      <Ratings career={career} players={players} />
      <h3>{t("club.squad")}</h3>
      <PlanTable career={career} players={players} />
    </section>
  );
}
