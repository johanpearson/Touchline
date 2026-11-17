import type { TeamTactics } from "../../engine";
import type { MessageKey } from "../../i18n";
import { SegmentedControl } from "../components";
import { useI18n } from "../i18n-provider";
import { TACTIC_LEVELS, TACTIC_NAMES, type TacticName } from "../tactics-editor";

const withTactic = (tactics: TeamTactics, name: TacticName, level: string): TeamTactics => ({
  ...tactics,
  [name]: level,
});

export type TacticControlsProps = {
  tactics: TeamTactics;
  onChange: (tactics: TeamTactics) => void;
};

/** The four tactic settings as segmented controls, each with what it does and its risk side. */
export function TacticControls({ tactics, onChange }: TacticControlsProps) {
  const { t } = useI18n();
  return (
    <div data-testid="tactics" className="flex flex-col gap-5">
      {TACTIC_NAMES.map((name) => (
        <div
          key={name}
          data-testid={`tactic-${name}`}
          data-value={tactics[name]}
          className="flex flex-col gap-1.5"
        >
          <span className="font-semibold text-text">{t(`squad.tactic.${name}`)}</span>
          <p className="m-0 text-sm text-soft">{t(`tactics.desc.${name}`)}</p>
          <SegmentedControl
            label={t(`squad.tactic.${name}`)}
            value={tactics[name]}
            options={TACTIC_LEVELS[name].map((level) => ({
              value: level as string,
              label: t(`squad.level.${level}` as MessageKey),
            }))}
            onValueChange={(level) => onChange(withTactic(tactics, name, level))}
            className="w-full [&>button]:flex-1"
          />
          <p className="m-0 text-sm text-muted">
            <span className="font-semibold">{t("tactics.risk")}: </span>
            {t(`tactics.risk.${name}`)}
          </p>
        </div>
      ))}
    </div>
  );
}
