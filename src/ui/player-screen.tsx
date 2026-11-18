import type { AttributeName, Career } from "../game";
import { MAX_ATTRIBUTE } from "../game";
import type { MessageKey } from "../i18n";
import { Badge, Card } from "./components";
import { useI18n } from "./i18n-provider";
import { NotFoundScreen } from "./not-found-screen";
import {
  attributeBand,
  attributeGroups,
  type PlayerProfile,
  playerProfile,
} from "./player-profile";
import { hrefFor } from "./routes";
import { ClubCrest } from "./shell/club-crest";

const TRACK =
  "h-2 flex-1 overflow-hidden rounded-pill bg-track shadow-[inset_0_0_0_1px_var(--line)]";

function AttributeRow({ name, profile }: { name: AttributeName; profile: PlayerProfile }) {
  const { t, formatNumber } = useI18n();
  const value = profile.player[name];
  const band = t(`player.band.${attributeBand(value)}`);
  const label = t(`attr.${name}` as MessageKey);
  return (
    <li
      className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
      data-testid={`player-attr-${name}`}
    >
      <span className="shrink-0 text-soft sm:w-28">{label}</span>
      <span
        role="img"
        aria-label={t("player.attribute.aria", {
          name: label,
          value: formatNumber(value, 0),
          band,
        })}
        data-testid={`player-attr-bar-${name}`}
        className={TRACK}
      >
        <span
          className="block h-full rounded-pill"
          style={{
            width: `${(value / MAX_ATTRIBUTE) * 100}%`,
            background: profile.club.colours.primary,
          }}
        />
      </span>
      <span className="flex items-baseline gap-2 sm:contents">
        <span
          className="font-heading text-xl tabular text-text sm:w-7 sm:text-right"
          data-testid={`player-attr-value-${name}`}
        >
          {formatNumber(value, 0)}
        </span>
        <span className="text-sm text-muted sm:w-14">{band}</span>
        <span className="text-sm tabular text-muted sm:w-16 sm:text-right">
          {t("player.attribute.now", { value: formatNumber(profile.effective[name], 1) })}
        </span>
      </span>
    </li>
  );
}

function Attributes({ profile }: { profile: PlayerProfile }) {
  const { t } = useI18n();
  return (
    <Card data-testid="player-attributes" className="flex flex-col gap-4">
      <h3 className="m-0 font-heading text-xl text-text">{t("player.attributes")}</h3>
      <p className="m-0 text-sm text-muted">{t("player.attributes.hint")}</p>
      <div className="grid gap-6 md:grid-cols-2">
        {attributeGroups(profile.player.position).map((group) => (
          <section key={group.id} aria-labelledby={`player-group-${group.id}`}>
            <h4 id={`player-group-${group.id}`} className="mb-2 mt-0 text-soft">
              {t(`player.group.${group.id}`)}
            </h4>
            <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-3 p-0 sm:grid-cols-1 sm:gap-y-2">
              {group.names.map((name) => (
                <AttributeRow key={name} name={name} profile={profile} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}

function Stat({ label, testId, children }: { label: string; testId: string; children: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="m-0 font-heading text-3xl tabular text-text" data-testid={testId}>
        {children}
      </dd>
    </div>
  );
}

function Summary({ profile }: { profile: PlayerProfile }) {
  const { t, formatNumber } = useI18n();
  const { club, status } = profile;
  return (
    <Card className="flex flex-col gap-4">
      <dl className="m-0 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label={t("player.overall")} testId="player-overall">
          {formatNumber(profile.overall, 1)}
        </Stat>
        <Stat label={t("player.fitness")} testId="player-fitness">
          {formatNumber(profile.fitness, 0)}
        </Stat>
        <Stat label={t("player.form")} testId="player-form">
          {formatNumber(profile.form, 0)}
        </Stat>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted">{t("player.status")}</dt>
          <dd className="m-0" data-testid="player-status">
            <Badge tone={status === "starter" ? "good" : "neutral"}>
              {status === null ? t("player.status.otherClub") : t(`squad.status.${status}`)}
            </Badge>
          </dd>
        </div>
      </dl>
      <p className="m-0 flex items-center gap-2">
        <ClubCrest shortName={club.shortName} colours={club.colours} size={24} />
        <span className="text-muted">{t("player.club")}:</span>
        <a data-testid="player-club" href={hrefFor({ name: "club", clubId: club.id })}>
          {club.name}
        </a>
      </p>
    </Card>
  );
}

function SeasonRecord({ profile }: { profile: PlayerProfile }) {
  const { t, formatNumber } = useI18n();
  return (
    <Card className="flex flex-col gap-2">
      <h3 className="m-0 font-heading text-xl text-text">{t("player.season")}</h3>
      <dl className="m-0">
        <Stat label={t("player.goals")} testId="player-goals">
          {profile.goals === null ? t("player.goals.notRecorded") : formatNumber(profile.goals, 0)}
        </Stat>
      </dl>
    </Card>
  );
}

/** A player's profile: who they are, how good they are and how they are doing. */
export function PlayerView({ career, playerId }: { career: Career; playerId: string }) {
  const { t } = useI18n();
  const profile = playerProfile(career, playerId);
  if (!profile) return <NotFoundScreen />;
  return (
    <section data-testid="player-screen" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 data-testid="player-name" className="m-0 font-heading text-3xl text-text">
          {profile.player.name}
        </h2>
        <p className="m-0 text-muted" data-testid="player-line">
          {t("player.ageLine", {
            position: t(`position.${profile.player.position}`),
            age: String(profile.player.age),
          })}
        </p>
      </header>
      <Summary profile={profile} />
      <Attributes profile={profile} />
      <SeasonRecord profile={profile} />
    </section>
  );
}
