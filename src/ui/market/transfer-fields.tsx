import { Input } from "../components";
import { useI18n } from "../i18n-provider";
import { formatMoney } from "../money-format";

export type TransferFieldsProps = {
  buying: boolean;
  /** The asking fee (buy) or asked wage (sign), in thousands. */
  asked: number;
  amount: string;
  seasons: string;
  onAmount: (text: string) => void;
  onSeasons: (text: string) => void;
};

/** The two inputs of the transfer dialog: fee or wage, and the contract length. */
export function TransferFields(props: TransferFieldsProps) {
  const { t, locale } = useI18n();
  const { buying } = props;
  return (
    <>
      <Input
        inputMode="numeric"
        label={t(buying ? "market.field.fee" : "market.field.wage")}
        hint={t(buying ? "market.field.fee.hint" : "market.field.wage.hint", {
          amount: formatMoney(props.asked, locale),
        })}
        value={props.amount}
        onChange={(event) => props.onAmount(event.target.value)}
        data-testid={buying ? "fee-input" : "wage-input"}
      />
      <Input
        inputMode="numeric"
        label={t("market.field.seasons")}
        value={props.seasons}
        onChange={(event) => props.onSeasons(event.target.value)}
        data-testid="seasons-input"
      />
    </>
  );
}
