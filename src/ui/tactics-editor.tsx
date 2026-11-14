import type { Mentality, Pressing, TeamTactics, Tempo, Width } from "../engine";
import type { MessageKey } from "../i18n";
import { useI18n } from "./i18n-provider";

const TACTIC_LEVELS = {
  mentality: ["defensive", "balanced", "attacking"],
  pressing: ["low", "medium", "high"],
  width: ["narrow", "normal", "wide"],
  tempo: ["slow", "normal", "fast"],
} as const satisfies { [K in keyof TeamTactics]: readonly TeamTactics[K][] };

type TacticName = keyof TeamTactics;
const TACTIC_NAMES = Object.keys(TACTIC_LEVELS) as TacticName[];

export type TacticsEditorProps = {
  tactics: TeamTactics;
  onChange: (tactics: TeamTactics) => void;
};

/** The four tactics selectors, shared by the squad screen and the half-time panel. */
export function TacticsEditor({ tactics, onChange }: TacticsEditorProps) {
  const { t } = useI18n();
  return (
    <fieldset data-testid="tactics">
      <legend>{t("squad.tactics")}</legend>
      {TACTIC_NAMES.map((name) => (
        <label key={name}>
          {t(`squad.tactic.${name}`)}{" "}
          <select
            data-testid={`tactic-${name}`}
            value={tactics[name]}
            onChange={(e) =>
              onChange({
                ...tactics,
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
  );
}
