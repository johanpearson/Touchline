import type { AttributeChange } from "../game";
import { ATTRIBUTE_NAMES, type AttributeName } from "../game";
import { Drawer } from "./components";
import { useI18n } from "./i18n-provider";
import { formatMoney } from "./money-format";
import { developmentOf, type SquadRow } from "./squad-rows";

type Props = {
  row: SquadRow | null;
  /** The change list of the last development; none before the first rollover. */
  development: readonly AttributeChange[] | undefined;
  onClose: () => void;
};

function Marker({ delta }: { delta: number }) {
  const { t, formatSigned } = useI18n();
  if (delta === 0) return <span className="text-muted">{t("squad.details.same")}</span>;
  const text = formatSigned(delta);
  const word = t(delta > 0 ? "squad.details.up" : "squad.details.down", { delta: text });
  return (
    <span className={delta > 0 ? "text-good" : "text-warn"}>
      <span className="sr-only">{word}</span>
      <span aria-hidden="true">
        {delta > 0 ? "▲" : "▼"} {text}
      </span>
    </span>
  );
}

/** A side sheet with all attributes of one player and, after the first rollover, their change. */
export function SquadDetail({ row, development, onClose }: Props) {
  const { t, formatNumber, locale } = useI18n();
  const deltas = row ? developmentOf(development, row.player.id) : {};
  const hasHistory = development !== undefined;
  return (
    <Drawer
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={row ? t("squad.details.title", { name: row.player.name }) : ""}
      description={
        row
          ? t("squad.details.summary", {
              age: row.age,
              stars: row.potentialStars,
              season: row.contractEnd,
            })
          : undefined
      }
      closeLabel={t("squad.details.close")}
      focusTitle
    >
      {row ? (
        <div data-testid="player-detail" className="flex flex-col gap-3">
          <p className="m-0 text-soft" data-testid="player-detail-money">
            {t("squad.details.money", {
              wage: formatMoney(row.wage, locale),
              value: formatMoney(row.value, locale),
            })}
          </p>
          <h3 className="m-0 font-heading text-xl text-text">{t("squad.details.attributes")}</h3>
          {hasHistory ? null : (
            <p className="m-0 text-sm text-muted" data-testid="player-detail-no-history">
              {t("squad.details.noHistory")}
            </p>
          )}
          <ul className="m-0 grid list-none gap-1 p-0">
            {ATTRIBUTE_NAMES.map((name: AttributeName) => (
              <li
                key={name}
                data-testid={`detail-attr-${name}`}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="text-soft">{t(`attr.${name}`)}</span>
                <span className="flex items-baseline gap-3 tabular">
                  <span className="text-text">{formatNumber(row.player[name], 0)}</span>
                  {hasHistory ? (
                    <span data-testid={`detail-delta-${name}`} className="min-w-16 text-right">
                      <Marker delta={deltas[name] ?? 0} />
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Drawer>
  );
}
