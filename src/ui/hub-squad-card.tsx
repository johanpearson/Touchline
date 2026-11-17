import { AlertTriangle } from "lucide-react";
import type { Career } from "../game";
import { Badge, Button, Card } from "./components";
import { type HubSquadStatus, hubSquadStatus } from "./hub-data";
import { useI18n } from "./i18n-provider";
import { hrefFor } from "./routes";

const MAX_ALERTS = 3;

function Stat({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-md bg-sunk px-3 py-2">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="m-0 font-heading text-2xl text-text tabular-nums" data-testid={id}>
        {value}
      </dd>
    </div>
  );
}

function Alerts({ low }: { low: HubSquadStatus["low"] }) {
  const { t, formatNumber } = useI18n();
  if (low.length === 0) {
    return (
      <p className="m-0 text-soft" data-testid="squad-all-fit">
        {t("hub.squad.allFit")}
      </p>
    );
  }
  const shown = low.slice(0, MAX_ALERTS);
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 text-[13px] font-semibold tracking-wide text-muted uppercase">
        {t("hub.squad.alerts")}
      </h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {shown.map(({ player, fitness }) => (
          <li
            key={player.id}
            data-testid={`squad-alert-${player.id}`}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex min-w-0 items-center gap-2 text-text">
              <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-warn" />
              <span className="min-w-0 break-words">{player.name}</span>
            </span>
            <Badge tone="warn">
              {t("hub.squad.lowFitness", { fitness: formatNumber(fitness, 0) })}
            </Badge>
          </li>
        ))}
      </ul>
      {low.length > shown.length ? (
        <p className="m-0 text-[13px] text-muted" data-testid="squad-alerts-more">
          {t("hub.squad.more", { count: low.length - shown.length })}
        </p>
      ) : null}
    </div>
  );
}

/** Fitness and form of the likely starting eleven, and who is too tired to play. */
export function HubSquadCard({ career }: { career: Career }) {
  const { t, formatNumber } = useI18n();
  const status = hubSquadStatus(career);
  return (
    <Card aria-labelledby="hub-squad-title" role="region" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="hub-squad-title" className="m-0 font-heading text-xl text-text">
          {t("hub.squad.title")}
        </h2>
        <Button asChild variant="ghost">
          <a href={hrefFor({ name: "squad" })}>{t("hub.squad.open")}</a>
        </Button>
      </div>
      <dl className="m-0 flex gap-3">
        <Stat
          id="squad-fitness"
          label={t("hub.squad.fitness")}
          value={`${formatNumber(status.fitness, 0)}%`}
        />
        <Stat id="squad-form" label={t("hub.squad.form")} value={formatNumber(status.form, 1)} />
      </dl>
      <Alerts low={status.low} />
    </Card>
  );
}
