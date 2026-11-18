import { type ReactNode, useState } from "react";
import type { Career, Player, RenewError } from "../../game";
import { Badge, Button, Card, Dialog } from "../components";
import { useI18n } from "../i18n-provider";
import { DEFAULT_SEASONS, parseWholeNumber } from "../market/market-status";
import { TransferFields } from "../market/transfer-fields";
import { formatMoney } from "../money-format";
import { hrefFor } from "../routes";
import { type Mover, offSeasonReview } from "./off-season-review";
import {
  type ExpiringRow,
  expiringPlayers,
  renewErrorKey,
  type StartBlock,
  startBlock,
} from "./off-season-status";

type Translate = ReturnType<typeof useI18n>["t"];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-2" data-testid={id}>
      <h3 className="m-0 font-heading text-xl font-semibold">{title}</h3>
      {children}
    </Card>
  );
}

const positionLabel = (t: Translate, player: Pick<Player, "position">) =>
  t(`position.short.${player.position}`);

function Movers({ id, title, movers }: { id: string; title: string; movers: Mover[] }) {
  const { t, formatNumber, formatSigned } = useI18n();
  return (
    <Section id={id} title={title}>
      {movers.length === 0 ? (
        <p className="m-0 text-muted">{t("offSeason.nobody")}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-1 p-0 tabular-nums">
          {movers.map((m) => (
            <li key={m.player.id} data-testid={`${id}-${m.player.id}`}>
              {t("offSeason.mover", {
                name: m.player.name,
                before: formatNumber(m.before, 1),
                after: formatNumber(m.after, 1),
                delta: formatSigned(Math.round(m.delta * 10) / 10),
              })}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function Review({ career }: { career: Career }) {
  const { t, locale } = useI18n();
  const review = offSeasonReview(career);
  const money = (value: number) => formatMoney(value, locale);
  return (
    <div className="flex flex-col gap-4" data-testid="off-season-review">
      <h3 className="sr-only">{t("offSeason.review")}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Movers id="risers" title={t("offSeason.risers")} movers={review.risers} />
        <Movers id="fallers" title={t("offSeason.fallers")} movers={review.fallers} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Section id="retirements" title={t("offSeason.retirements")}>
          {review.retired.length === 0 ? (
            <p className="m-0 text-muted">{t("offSeason.nobody")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {review.retired.map((r) => (
                <li key={`${r.name}-${r.age}`}>
                  {t("offSeason.retired", {
                    name: r.name,
                    position: positionLabel(t, r),
                    age: r.age,
                  })}
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section id="youth" title={t("offSeason.youth")}>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {review.youth.map((p) => (
              <li key={p.id} data-testid={`youth-${p.id}`}>
                {t("offSeason.youthPlayer", {
                  name: p.name,
                  position: positionLabel(t, p),
                  age: p.age,
                })}
              </li>
            ))}
          </ul>
        </Section>
      </div>
      {review.money ? (
        <Section id="season-money" title={t("offSeason.money")}>
          <dl className="m-0 flex flex-wrap gap-x-8 gap-y-2">
            {(
              [
                ["income", "offSeason.income", review.money.income],
                ["wages", "offSeason.wages", review.money.wages],
                ["balance", "offSeason.balance", review.money.balance],
              ] as const
            ).map(([id, label, value]) => (
              <div key={id}>
                <dt className="text-sm text-muted">{t(label)}</dt>
                <dd className="m-0 font-heading text-xl" data-testid={`money-${id}`}>
                  {money(value)}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}
    </div>
  );
}

type ResignDialogProps = {
  row: ExpiringRow;
  onSubmit: (wage: number, seasons: number) => RenewError | null;
  onClose: () => void;
};

function ResignDialog({ row, onSubmit, onClose }: ResignDialogProps) {
  const { t, locale } = useI18n();
  const [wage, setWage] = useState(String(row.ask));
  const [seasons, setSeasons] = useState(String(DEFAULT_SEASONS));
  const [error, setError] = useState<RenewError | null>(null);
  const confirm = () => {
    const refused = onSubmit(parseWholeNumber(wage), parseWholeNumber(seasons));
    setError(refused);
    if (refused === null) onClose();
  };
  const name = row.player.name;
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("offSeason.resignDialog.title", { name })}
      description={t("offSeason.resignDialog.description", { wage: formatMoney(row.ask, locale) })}
      closeLabel={t("market.dialog.close")}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("market.dialog.cancel")}
          </Button>
          <Button data-testid="confirm-resign" onClick={confirm}>
            {t("offSeason.resignDialog.confirm")}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          confirm();
        }}
        className="flex flex-col gap-3"
        noValidate
      >
        <TransferFields
          buying={false}
          asked={row.ask}
          amount={wage}
          seasons={seasons}
          onAmount={setWage}
          onSeasons={setSeasons}
        />
        {error ? (
          <p role="alert" data-testid="renewal-error" className="m-0 text-bad">
            {t(renewErrorKey(error))}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}

type ContractsProps = {
  career: Career;
  onRenew: (playerId: string, wage: number, seasons: number) => RenewError | null;
};

function Contracts({ career, onRenew }: ContractsProps) {
  const { t, locale } = useI18n();
  const [target, setTarget] = useState<ExpiringRow | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const rows = expiringPlayers(career);
  return (
    <Section id="off-season-contracts" title={t("offSeason.contracts")}>
      <p className="m-0 text-soft">{t("offSeason.contracts.lead")}</p>
      {done ? (
        <p role="status" data-testid="renewal-done" className="m-0 text-good">
          {done}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="m-0 text-muted">{t("offSeason.contracts.none")}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((row) => (
            <li key={row.player.id} className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1">
                <strong>{row.player.name}</strong> <Badge>{positionLabel(t, row.player)}</Badge>{" "}
                <span className="text-muted">
                  {t("offSeason.contract.ended", {
                    season: row.ends,
                    wage: formatMoney(row.ask, locale),
                  })}
                </span>
              </span>
              <Button
                variant="secondary"
                data-testid={`resign-${row.player.id}`}
                aria-label={t("offSeason.resignLabel", { name: row.player.name })}
                onClick={() => setTarget(row)}
              >
                {t("offSeason.resign")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {target ? (
        <ResignDialog
          row={target}
          onClose={() => setTarget(null)}
          onSubmit={(wage, seasons) => {
            const error = onRenew(target.player.id, wage, seasons);
            if (error === null) {
              setDone(
                t("offSeason.resigned", {
                  name: target.player.name,
                  wage: formatMoney(wage, locale),
                }),
              );
            }
            return error;
          }}
        />
      ) : null}
    </Section>
  );
}

const blockText = (t: Translate, block: StartBlock): string => {
  switch (block.kind) {
    case "over":
      return t("offSeason.blocked.over", { count: block.count, max: block.max });
    case "under":
      return t("offSeason.blocked.under", { count: block.count, min: block.min });
    case "positions":
      return t("offSeason.blocked.positions", { missing: block.missing });
  }
};

export type OffSeasonViewProps = {
  career: Career;
  onRenew: (playerId: string, wage: number, seasons: number) => RenewError | null;
  onStart: () => void;
};

/** The off-season: the review of the finished rollover, contract renewals, the market and the start button. */
export function OffSeasonView({ career, onRenew, onStart }: OffSeasonViewProps) {
  const { t } = useI18n();
  const block = startBlock(career);
  return (
    <section data-testid="screen-off-season" className="mx-auto flex max-w-4xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="m-0 font-heading text-3xl font-bold">
          {t("offSeason.title", { season: career.season.number })}
        </h2>
        <p className="m-0 text-soft">{t("offSeason.lead")}</p>
      </header>
      <Review career={career} />
      <Contracts career={career} onRenew={onRenew} />
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary" size="lg">
          <a data-testid="off-season-market" href={hrefFor({ name: "market" })}>
            {t("offSeason.market")}
          </a>
        </Button>
        <Button
          variant="primary"
          size="lg"
          data-testid="start-next-season"
          disabled={block !== null}
          aria-describedby={block ? "start-blocked-reason" : undefined}
          onClick={onStart}
        >
          {t("offSeason.start", { season: career.season.number + 1 })}
        </Button>
      </div>
      {block ? (
        <p id="start-blocked-reason" data-testid="start-blocked-reason" className="m-0 text-warn">
          {blockText(t, block)}
        </p>
      ) : null}
    </section>
  );
}
