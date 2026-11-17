import { useState } from "react";
import { type Career, kitsOf, type Player } from "../../game";
import type { MessageKey } from "../../i18n";
import { Card, SegmentedControl } from "../components";
import { useMediaQuery } from "../components/use-media-query";
import { useI18n } from "../i18n-provider";
import { BenchList } from "./bench-list";
import { FormationControls } from "./formation-controls";
import { benchCandidates, benchEdit, starterCandidates, starterEdit } from "./lineup-model";
import { LineupPitch } from "./lineup-pitch";
import { type PickerState, PlayerPicker } from "./player-picker";
import { RatingsPanel } from "./ratings-panel";
import { SlotList } from "./slot-list";
import { benchSlots, starterSlots } from "./slots";
import { TacticControls } from "./tactic-controls";
import { squadPlayers, useLineupEdit } from "./use-lineup-edit";

const ERROR_KEYS = {
  "wrong-formation-shape": "squad.error.wrongFormationShape",
  "wrong-bench-size": "squad.error.wrongBenchSize",
  "bench-without-keeper": "squad.error.benchWithoutKeeper",
  "duplicate-player": "squad.error.duplicatePlayer",
  "unknown-player": "squad.error.unknownPlayer",
} as const satisfies Record<string, MessageKey>;

type View = "pitch" | "list";
type Target = { kind: "starter" | "bench"; index: number };

const PHONE = "(max-width: 639.98px)";

function Section(props: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <Card data-testid={props.testId} className="flex flex-col gap-3">
      <h3 className="m-0 font-heading text-lg text-text">{props.title}</h3>
      {props.children}
    </Card>
  );
}

/** The lineup and tactics screen at `#/tactics`: formation, starters, bench, tactics and live team ratings. */
export function TacticsScreen({ career }: { career: Career }) {
  const { t } = useI18n();
  const phone = useMediaQuery(PHONE);
  const [chosenView, setView] = useState<View | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const editing = useLineupEdit(career);
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const players = squadPlayers(career);
  const byId = new Map(players.map((p) => [p.id, p]));
  const plan = career.squadPlan;
  const starters = starterSlots(career, byId);
  const bench = benchSlots(career, byId);
  const view: View = chosenView ?? (phone ? "list" : "pitch");

  const statusOf = (player: Player) =>
    plan.starters.includes(player.id)
      ? "starter"
      : plan.bench.includes(player.id)
        ? "bench"
        : "out";
  const picker = (): PickerState | null => {
    if (!target) return null;
    const common = {
      statusOf,
      fitnessOf: (id: string) => Math.round(career.condition[id]?.fitness ?? 100),
      formOf: (id: string) => career.condition[id]?.form ?? 5,
    };
    if (target.kind === "starter") {
      const slot = starters[target.index];
      if (!slot) return null;
      return {
        ...common,
        title: t("tactics.picker.title", { role: t(`tactics.role.${slot.role}`) }),
        hint: t("tactics.picker.hint"),
        currentId: slot.player.id,
        candidates: starterCandidates(players, plan, slot.player.id, slot.line),
        keeperLocked: () => false,
        onChoose: (id) => {
          editing.edit(starterEdit(plan, slot.player.id, id));
          setTarget(null);
        },
      };
    }
    const slot = bench[target.index];
    if (!slot) return null;
    return {
      ...common,
      title: t("tactics.picker.bench", { slot: slot.index + 1 }),
      hint: t("tactics.picker.benchHint"),
      currentId: slot.player.id,
      candidates: benchCandidates(players, plan, slot.player.id, byId),
      keeperLocked: (candidate) => !plan.starters.includes(candidate.player.id),
      onChoose: (id) => {
        editing.edit(benchEdit(plan, slot.player.id, id));
        setTarget(null);
      },
    };
  };

  return (
    <section data-testid="tactics-screen" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="m-0 font-heading text-3xl text-text">{t("tactics.title")}</h2>
        <p className="m-0 text-muted" data-testid="tactics-summary">
          {t("tactics.summary", { club: club?.name ?? "", formation: plan.formation })}
        </p>
      </header>
      {editing.error ? (
        <p
          role="alert"
          data-testid="squad-error"
          className="m-0 rounded-md border border-bad p-3 text-text"
        >
          {t(ERROR_KEYS[editing.error])}
        </p>
      ) : null}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div data-testid="lineup-view">
            <SegmentedControl
              label={t("tactics.view.label")}
              value={view}
              options={[
                { value: "pitch", label: t("tactics.view.pitch") },
                { value: "list", label: t("tactics.view.list") },
              ]}
              onValueChange={setView}
              className="[&>button]:border-0 [&>button[aria-checked=false]]:bg-transparent"
            />
          </div>
          {view === "pitch" ? (
            <>
              <p className="m-0 text-sm text-muted">{t("tactics.pitch.hint")}</p>
              <LineupPitch
                slots={starters}
                kit={club ? kitsOf(club).home : { body: "#888888", trim: "#cccccc" }}
                onPick={(index) => setTarget({ kind: "starter", index })}
              />
              <BenchList slots={bench} onPick={(index) => setTarget({ kind: "bench", index })} />
            </>
          ) : (
            <SlotList
              career={career}
              players={players}
              byId={byId}
              starters={starters}
              bench={bench}
              edit={editing.edit}
            />
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Section title={t("squad.formation")}>
            <FormationControls formation={plan.formation} onPick={editing.pickFormation} />
          </Section>
          <Section title={t("squad.tactics")}>
            <TacticControls tactics={plan.tactics} onChange={editing.setTactics} />
          </Section>
          <Section title={t("squad.ratings")}>
            <RatingsPanel career={career} players={players} />
          </Section>
        </div>
      </div>
      <PlayerPicker state={picker()} onClose={() => setTarget(null)} />
    </section>
  );
}
