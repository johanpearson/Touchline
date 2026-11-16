import { type KeyboardEvent, useRef } from "react";
import { targetIndex } from "../components/segmented-keys";
import { useI18n } from "../i18n-provider";
import { hrefFor } from "../routes";
import { LeagueCard } from "./league-card";
import { type LeaguePreview, PLAYABLE_LEAGUE_ID, ROADMAP_LEAGUES } from "./league-preview";
import { LeaguePreviewPanel } from "./league-preview-panel";
import { WizardHeader } from "./wizard-header";

type LeagueStepProps = {
  preview: LeaguePreview;
  /** The league chosen so far; the playable league counts as chosen until the user picks another. */
  leagueId: string | null;
  onChoose: (leagueId: string) => void;
  /** Goes on to step 2 with the given league. */
  onContinue: (leagueId: string) => void;
};

/** Step 1: league cards (only the playable one can be chosen) and the preview of the chosen one. */
export function LeagueStep({ preview, leagueId, onChoose, onContinue }: LeagueStepProps) {
  const { t } = useI18n();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedId = leagueId ?? PLAYABLE_LEAGUE_ID;
  const cards = [
    {
      id: PLAYABLE_LEAGUE_ID,
      name: preview.name,
      region: t("newCareer.league.first.region"),
      facts: [
        t("newCareer.league.clubCount", { count: preview.clubCount }),
        t("newCareer.league.roundCount", { rounds: preview.rounds }),
      ],
      locked: false,
    },
    ...ROADMAP_LEAGUES.map((entry) => ({
      id: entry.id,
      name: t(entry.nameKey),
      region: t(entry.regionKey),
      facts: [],
      locked: true,
    })),
  ];

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = targetIndex(
      event.key,
      index,
      cards.map((card) => !card.locked),
    );
    const next = cards[target];
    if (!next) return;
    event.preventDefault();
    onChoose(next.id);
    refs.current[target]?.focus();
  };

  return (
    <div className="flex flex-col gap-2" data-testid="league-step">
      <WizardHeader
        step={1}
        total={2}
        title={t("newCareer.league.title")}
        backHref={hrefFor({ name: "home" })}
        backLabel={t("newCareer.backToStart")}
      />
      <div className="flex flex-wrap items-start gap-6">
        <div
          role="radiogroup"
          aria-label={t("newCareer.league.group")}
          className="grid min-w-0 flex-[999_1_560px] grid-cols-[repeat(auto-fill,minmax(min(250px,100%),1fr))] gap-3.5"
        >
          {cards.map((card, index) => (
            <LeagueCard
              key={card.id}
              {...card}
              checked={!card.locked && card.id === selectedId}
              tabStop={card.id === selectedId}
              buttonRef={(node) => {
                refs.current[index] = node;
              }}
              onSelect={() => onChoose(card.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            />
          ))}
        </div>
        <LeaguePreviewPanel preview={preview} onChoose={() => onContinue(selectedId)} />
      </div>
    </div>
  );
}
