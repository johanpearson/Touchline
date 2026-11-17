import { useState } from "react";
import {
  type Career,
  deriveLineRatings,
  FORMATION_SHAPE,
  FORMATIONS,
  type Formation,
  LINE_RATINGS,
  type LineupError,
  type Player,
  type PlayerPosition,
  type SquadPlan,
} from "../game";
import type { MessageKey } from "../i18n";
import { useI18n } from "./i18n-provider";
import { hrefFor } from "./routes";
import { TacticsEditor } from "./tactics-editor";
import { useCareer } from "./use-career";

const LINE_ORDER: readonly PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];

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
    <span className="inline-flex items-center gap-2">
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
            disabled={
              p.id !== props.value && (props.used.has(p.id) || (props.locked?.(p) ?? false))
            }
          >
            {`${p.name} (${t(`position.short.${p.position}`)})`}
          </option>
        ))}
      </select>
      <a
        data-testid={`profile-link-${props.testId}`}
        href={hrefFor({ name: "player", playerId: props.value })}
        aria-label={t("player.open", {
          name: props.players.find((p) => p.id === props.value)?.name ?? "",
        })}
      >
        {t("player.openShort")}
      </a>
    </span>
  );
}

function Ratings({ career, players }: PlanProps) {
  const { t, formatNumber } = useI18n();
  const ratings = deriveLineRatings(players, career.squadPlan, career.condition);
  return (
    <section>
      <h3>{t("squad.ratings")}</h3>
      <dl className="club-ratings" data-testid="plan-ratings">
        {LINE_RATINGS.map((line) => (
          <div key={line}>
            <dt>{t(`rating.${line}`)}</dt>
            <dd data-testid={`plan-rating-${line}`}>{formatNumber(ratings[line], 0)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type LineupEdit = { starters?: string[]; bench?: string[] };
type PlanEditorProps = PlanProps & {
  edit: (next: LineupEdit) => void;
  byId: ReadonlyMap<string, Player>;
};

const replaceId = (list: readonly string[], from: string, to: string) =>
  list.map((id) => (id === from ? to : id));

/** Puts `to` in `from`'s place and, if `to` was in the list, `from` in `to`'s place. */
const swapIds = (list: readonly string[], from: string, to: string) =>
  list.map((id) => (id === from ? to : id === to ? from : id));

/** Choosing a bench player as starter sends the starter to that bench slot. */
const starterEdit = (plan: SquadPlan, from: string, to: string): LineupEdit =>
  plan.bench.includes(to)
    ? { starters: replaceId(plan.starters, from, to), bench: replaceId(plan.bench, to, from) }
    : { starters: replaceId(plan.starters, from, to) };

function FormationControls({ career, onPick }: { career: Career; onPick: (f: Formation) => void }) {
  const { t } = useI18n();
  const { formation } = career.squadPlan;
  return (
    <div className="squad-controls">
      <label>
        {t("squad.formation")}{" "}
        <select
          data-testid="formation"
          value={formation}
          onChange={(e) => onPick(e.target.value as Formation)}
        >
          {FORMATIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <button type="button" data-testid="auto-pick" onClick={() => onPick(formation)}>
        {t("squad.autoPick")}
      </button>
    </div>
  );
}

function StarterLines({ career, players, byId, edit }: PlanEditorProps) {
  const { t } = useI18n();
  const plan = career.squadPlan;
  const starterSet = new Set(plan.starters);
  const starters = orderedStarters(plan.starters, byId);
  return (
    <>
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
                onChange={(to) => edit(starterEdit(plan, id, to))}
              />
            ))}
        </div>
      ))}
    </>
  );
}

function BenchSlots({ career, players, byId, edit }: PlanEditorProps) {
  const { t } = useI18n();
  const plan = career.squadPlan;
  const starterSet = new Set(plan.starters);
  const isKeeper = (id: string) => byId.get(id)?.position === "GK";
  const onlyKeeper = plan.bench.filter(isKeeper).length === 1;
  return (
    <>
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
            locked={(p) => isKeeper(id) && onlyKeeper && p.position !== "GK"}
            onChange={(to) => edit({ bench: swapIds(plan.bench, id, to) })}
          />
        ))}
      </div>
    </>
  );
}

/** The user's lineup, bench and tactics editor with the derived team ratings. */
export function LineupEditor({ career }: { career: Career }) {
  const { t } = useI18n();
  const { setLineup, setTactics, autoPickLineup } = useCareer();
  const [error, setError] = useState<LineupError | null>(null);
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const ids = new Set(club?.playerIds);
  const players = career.league.players.filter((p) => ids.has(p.id));
  const byId = new Map(players.map((p) => [p.id, p]));
  const plan = career.squadPlan;

  const edit = (next: LineupEdit) => {
    const result = setLineup({
      formation: plan.formation,
      starters: next.starters ?? plan.starters,
      bench: next.bench ?? plan.bench,
    });
    setError(result.ok ? null : result.error);
  };
  const pickFormation = (formation: Formation) => {
    autoPickLineup(formation);
    setError(null);
  };
  const shared = { career, players, byId, edit };

  return (
    <section data-testid="lineup-editor" className="club-screen">
      {error ? (
        <p role="alert" data-testid="squad-error">
          {t(ERROR_KEYS[error])}
        </p>
      ) : null}
      <FormationControls career={career} onPick={pickFormation} />
      <TacticsEditor tactics={plan.tactics} onChange={setTactics} />
      <StarterLines {...shared} />
      <BenchSlots {...shared} />
      <Ratings career={career} players={players} />
    </section>
  );
}
