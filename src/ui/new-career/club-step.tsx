import { ChevronLeft, ChevronRight } from "lucide-react";
import { type KeyboardEvent, useMemo, useState } from "react";
import { generateLeague } from "../../game";
import { Button, IconButton, Input } from "../components";
import { useI18n } from "../i18n-provider";
import { hrefFor } from "../routes";
import { useCareer } from "../use-career";
import { ClubCardView } from "./club-card-view";
import { buildClubCards } from "./club-cards";
import { ClubStrip, stripTarget } from "./club-strip";
import { WizardHeader } from "./wizard-header";

type ClubStepProps = { seed: number; onSeedChange: (seed: number) => void };

/** Step 2: one large club card with arrows, the club strip, the seed and the way into the career. */
export function ClubStep({ seed, onSeedChange }: ClubStepProps) {
  const { t } = useI18n();
  const { startCareer } = useCareer();
  const [index, setIndex] = useState(0);

  const cards = useMemo(() => {
    const generated = generateLeague({ seed });
    return generated.ok ? buildClubCards(generated.league.clubs, generated.league.players) : [];
  }, [seed]);

  const selected = Math.min(index, Math.max(cards.length - 1, 0));
  const card = cards[selected];
  const step = (by: number) => setIndex((selected + by + cards.length) % cards.length);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement) return;
    const target = stripTarget(event.key, selected, cards.length);
    if (target === null || event.key === "Home" || event.key === "End") return;
    event.preventDefault();
    setIndex(target);
  };

  const changeSeed = (text: string) => {
    const value = Number(text);
    if (text.trim() !== "" && Number.isSafeInteger(value)) onSeedChange(value);
  };

  const start = () => {
    if (card && startCareer(seed, card.club.id) === null) {
      window.location.hash = hrefFor({ name: "home" });
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: arrow keys on the card region change the club
    <section className="flex flex-col gap-5" data-testid="new-career" onKeyDown={onKeyDown}>
      <WizardHeader
        step={2}
        total={2}
        title={t("newCareer.club.title")}
        backHref={hrefFor({ name: "new" })}
        backLabel={t("newCareer.backToLeague")}
      />
      {card ? (
        <>
          <div className="grid grid-cols-2 items-center gap-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-[18px]">
            <IconButton
              variant="secondary"
              size="lg"
              label={t("newCareer.club.previous")}
              data-testid="club-prev"
              icon={<ChevronLeft className="size-[22px]" />}
              onClick={() => step(-1)}
              className="row-start-2 justify-self-start rounded-full sm:row-start-1 sm:size-[52px]"
            />
            <div className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
              <ClubCardView card={card} />
            </div>
            <IconButton
              variant="secondary"
              size="lg"
              label={t("newCareer.club.next")}
              data-testid="club-next"
              icon={<ChevronRight className="size-[22px]" />}
              onClick={() => step(1)}
              className="col-start-2 row-start-2 justify-self-end rounded-full sm:col-start-3 sm:row-start-1 sm:size-[52px]"
            />
          </div>
          <p
            aria-live="polite"
            data-testid="club-position"
            className="m-0 text-center text-sm text-muted tabular"
          >
            {t("newCareer.club.position", { position: selected + 1, count: cards.length })}
          </p>
          <ClubStrip cards={cards} selected={selected} onSelect={setIndex} />
        </>
      ) : null}
      <details className="text-sm">
        <summary className="min-h-11 cursor-pointer py-2.5 text-soft">
          {t("newCareer.club.advanced")}
        </summary>
        <Input
          label={t("newCareer.seed")}
          data-testid="seed-input"
          type="number"
          step={1}
          value={seed}
          onChange={(e) => changeSeed(e.target.value)}
          className="max-w-60"
        />
      </details>
      <Button
        variant="primary"
        size="lg"
        data-testid="start-career"
        disabled={!card}
        onClick={start}
        className="min-h-[52px] rounded-[14px] text-base font-bold max-sm:w-full sm:self-end"
      >
        {card ? t("newCareer.club.manage", { club: card.club.name }) : null}
      </Button>
    </section>
  );
}
