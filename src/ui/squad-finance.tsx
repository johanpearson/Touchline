import { TriangleAlert } from "lucide-react";
import { Card } from "./components";
import { useI18n } from "./i18n-provider";
import { formatMoney } from "./money-format";
import type { SquadFinance } from "./squad-rows";

function Warning({ id, text }: { id: string; text: string }) {
  return (
    <p role="status" data-testid={id} className="m-0 inline-flex items-center gap-2 text-warn">
      <TriangleAlert aria-hidden="true" className="size-4" />
      {text}
    </p>
  );
}

/** The user's club money: balance, wage bill and wage budget, with text warnings. */
export function SquadFinanceCard({ finance }: { finance: SquadFinance }) {
  const { t, locale } = useI18n();
  const money = (value: number) => formatMoney(value, locale);
  const perSeason = (value: number) => t("squad.finance.perSeason", { amount: money(value) });
  return (
    <Card role="group" aria-label={t("squad.finance.title")} className="flex flex-col gap-2">
      <dl className="m-0 flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <dt className="text-sm text-muted">{t("squad.finance.balance")}</dt>
          <dd className="m-0 font-heading text-xl text-text" data-testid="club-balance">
            {money(finance.balance)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("squad.finance.wageBill")}</dt>
          <dd className="m-0 font-heading text-xl text-text" data-testid="club-wage-bill">
            {perSeason(finance.wageBill)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("squad.finance.wageBudget")}</dt>
          <dd className="m-0 font-heading text-xl text-text" data-testid="club-wage-budget">
            {perSeason(finance.wageBudget)}
          </dd>
        </div>
      </dl>
      {finance.overBudget ? (
        <Warning id="club-warning-wages" text={t("squad.finance.warnWages")} />
      ) : null}
      {finance.negativeBalance ? (
        <Warning id="club-warning-balance" text={t("squad.finance.warnBalance")} />
      ) : null}
    </Card>
  );
}
