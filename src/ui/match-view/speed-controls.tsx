import { useI18n } from "../i18n-provider";
import { SPEEDS } from "./playback";

export type SpeedControlsProps = {
  paused: boolean;
  speed: number;
  onPausedChange: (paused: boolean) => void;
  onSpeedChange: (speed: number) => void;
};

/** Pause/play and the playback speed of the match. */
export function SpeedControls({
  paused,
  speed,
  onPausedChange,
  onSpeedChange,
}: SpeedControlsProps) {
  const { t } = useI18n();
  return (
    <fieldset className="controls">
      <legend className="visually-hidden">{t("controls.label")}</legend>
      <button type="button" data-testid="pause-toggle" onClick={() => onPausedChange(!paused)}>
        {paused ? t("controls.play") : t("controls.pause")}
      </button>
      <span>{t("controls.speed")}</span>
      {SPEEDS.map((value, index) => (
        <button
          key={value}
          type="button"
          data-testid={`speed-${index + 1}`}
          aria-pressed={value === speed}
          onClick={() => onSpeedChange(value)}
        >
          {`×${2 ** index}`}
        </button>
      ))}
    </fieldset>
  );
}
