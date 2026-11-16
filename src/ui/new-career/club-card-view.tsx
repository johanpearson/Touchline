import type { ReactNode } from "react";
import type { MessageKey } from "../../i18n";
import { Badge, type BadgeProps } from "../components";
import { useI18n } from "../i18n-provider";
import { ClubCrest } from "../shell/club-crest";
import { KitIcon } from "../shell/kit-icon";
import type { ClubCard, Difficulty } from "./club-cards";

const DIFFICULTY_TONE: Record<Difficulty, NonNullable<BadgeProps["tone"]>> = {
  easy: "good",
  normal: "info",
  hard: "warn",
  veryHard: "bad",
};

function Tile({ label, testId, children }: { label: string; testId: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-md bg-raised px-3.5 py-3">
      <span className="text-xs text-muted">{label}</span>
      <span
        data-testid={testId}
        className="font-heading text-[26px] leading-tight font-semibold [overflow-wrap:anywhere]"
      >
        {children}
      </span>
    </div>
  );
}

function LineBar({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex justify-between text-[13px]">
        <span className="text-muted">{label}</span>
        <strong data-testid={testId} className="tabular">
          {value}
        </strong>
      </div>
      <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-sm bg-track">
        <span className="block h-full bg-accent" style={{ width: `${value}%` }} />
      </span>
    </div>
  );
}

function Kits({ card }: { card: ClubCard }) {
  const { t } = useI18n();
  const kits = [
    { id: "home", label: t("newCareer.club.kitHome"), kit: card.kits.home },
    { id: "away", label: t("newCareer.club.kitAway"), kit: card.kits.away },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2" data-testid="club-kits">
      <span className="text-xs text-muted">{t("newCareer.club.kits")}</span>
      {kits.map(({ id, label, kit }) => (
        <span key={id} className="inline-flex items-center gap-2 text-[13px]">
          <KitIcon kit={kit} size={30} />
          {label}
        </span>
      ))}
      <span className="text-xs text-muted">{t("newCareer.club.kitNote")}</span>
    </div>
  );
}

/** The large card of the club picker: crest, difficulty, board expectation, ratings and kits. */
export function ClubCardView({ card }: { card: ClubCard }) {
  const { t } = useI18n();
  const { club, star } = card;
  const glow = `radial-gradient(70% 90% at 15% 20%, color-mix(in srgb, ${club.colours.primary} 22%, transparent), transparent)`;
  return (
    <section
      aria-label={t("newCareer.club.card")}
      data-testid="club-card"
      style={{ backgroundImage: glow }}
      className="box-border flex min-w-0 flex-col items-center gap-6 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:p-8"
    >
      <ClubCrest
        shortName={club.shortName}
        colours={club.colours}
        size={160}
        label={t("newCareer.club.crest", { club: club.name })}
        className="shrink-0 max-sm:size-28"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-4 max-sm:w-full">
        <div className="flex flex-col items-start gap-1">
          <Badge tone={DIFFICULTY_TONE[card.difficulty]} data-testid="club-difficulty">
            {t(`newCareer.club.difficulty.${card.difficulty}`)}
          </Badge>
          <h3
            data-testid="club-name"
            className="m-0 mt-1 font-heading text-[40px] leading-none font-bold [overflow-wrap:anywhere] sm:text-[52px]"
          >
            {club.name}
          </h3>
          <span data-testid="club-expectation" className="text-muted">
            {t(`newCareer.club.expect.${card.difficulty}`)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <LineBar label={t("newCareer.club.attack")} value={card.attack} testId="club-attack" />
          <LineBar
            label={t("newCareer.club.midfield")}
            value={card.midfield}
            testId="club-midfield"
          />
          <LineBar label={t("newCareer.club.defence")} value={card.defence} testId="club-defence" />
        </div>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
          <Tile label={t("newCareer.rating")} testId="club-rating">
            {card.rating}
          </Tile>
          <Tile label={t("newCareer.club.budget")} testId="club-budget">
            {t("newCareer.club.budgetValue", { amount: card.budgetMillions })}
          </Tile>
          <Tile label={t("newCareer.club.star")} testId="club-star">
            {star
              ? t("newCareer.club.starValue", {
                  name: star.name,
                  position: t(`newCareer.club.pos.${star.position}` satisfies MessageKey),
                })
              : "-"}
          </Tile>
        </div>
        <Kits card={card} />
      </div>
    </section>
  );
}
