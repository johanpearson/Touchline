import type { ActionEvent, PerSide, ZoneEvent } from "../../engine";
import { useI18n } from "../i18n-provider";
import { ChanceCue } from "./chance-cue";
import { ClassicPitch } from "./classic-pitch";
import type { PitchRendererFactory } from "./classic-pitch-renderer";
import type { SegmentChance } from "./director";
import { MomentumTerrain } from "./momentum-terrain";
import type { TerrainRendererFactory } from "./terrain-renderer";
import type { MatchView } from "./use-view-choice";

export type MatchStageProps = {
  view: MatchView;
  /** Text alternative of the canvas, with the live summary. */
  label: string;
  colours: PerSide<string>;
  matchTime: number;
  terrainEvents: readonly ZoneEvent[];
  createRenderer?: TerrainRendererFactory;
  pitch: { events: readonly ActionEvent[]; createRenderer?: PitchRendererFactory };
  showChain: boolean;
  /** The chance moment at the clock, shown as a cue over the stage. */
  chance?: SegmentChance;
  teamNames: PerSide<string>;
  players: Readonly<Record<string, string>>;
};

/**
 * The dark stage in every theme (`stage` and `stage-glow` tokens) holding the terrain or the 2D
 * pitch. Both renderers draw on a transparent canvas, so the stage tokens are their background. The
 * width is capped so the 16:10 pitch never grows taller than the viewport minus header and controls.
 */
export function MatchStage({
  view,
  label,
  colours,
  matchTime,
  terrainEvents,
  createRenderer,
  pitch,
  showChain,
  chance,
  teamNames,
  players,
}: MatchStageProps) {
  const { t } = useI18n();
  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-xl border border-line bg-stage"
      style={{
        maxWidth: "calc((100svh - 22rem) * 1.6)",
        minWidth: "min(100%, 18rem)",
        backgroundImage:
          "radial-gradient(ellipse at 50% 40%, var(--stage-glow) 0%, transparent 70%)",
      }}
      data-testid="match-stage"
    >
      {view === "pitch" ? (
        <ClassicPitch
          events={pitch.events}
          matchTime={matchTime}
          homeColour={colours.home}
          awayColour={colours.away}
          showChain={showChain}
          setPieceLabels={{
            kickoff: t("match.setPiece.kickoff"),
            throwIn: t("match.setPiece.throwIn"),
            goalKick: t("match.setPiece.goalKick"),
            corner: t("match.setPiece.corner"),
            freeKick: t("match.setPiece.freeKick"),
            penalty: t("match.setPiece.penalty"),
          }}
          createRenderer={pitch.createRenderer}
          label={label}
        />
      ) : (
        <MomentumTerrain
          events={terrainEvents}
          matchTime={matchTime}
          homeColour={colours.home}
          awayColour={colours.away}
          createRenderer={createRenderer}
          label={label}
        />
      )}
      <ChanceCue moment={chance} teamNames={teamNames} colours={colours} players={players} />
    </div>
  );
}
