import { type FormEvent, useState } from "react";
import type { TransferError } from "../../game";
import { Button, Dialog, Input } from "../components";
import { useI18n } from "../i18n-provider";
import { formatMoney } from "../money-format";
import { DEFAULT_SEASONS, parseWholeNumber, transferErrorKey } from "./market-status";

export type TransferDialogProps = {
  /** `buy` asks for a fee, `sign` (a free agent) for a wage. */
  mode: "buy" | "sign";
  playerName: string;
  clubName: string | null;
  /** The asking fee (buy) or the asked wage (sign), in thousands; prefilled in the input. */
  asked: number;
  /** The wage the player asks, in thousands. */
  wage: number;
  /** Tries the transfer; resolves to the refusal, or null when it went through (the dialog closes). */
  onSubmit: (amount: number, seasons: number) => TransferError | null;
  onClose: () => void;
};

/** The buy or sign dialog: the amount is prefilled with the asking price, a refusal is shown as text. */
export function TransferDialog(props: TransferDialogProps) {
  const { t, locale } = useI18n();
  const [amount, setAmount] = useState(String(props.asked));
  const [seasons, setSeasons] = useState(String(DEFAULT_SEASONS));
  const [error, setError] = useState<TransferError | null>(null);
  const buying = props.mode === "buy";

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const refused = props.onSubmit(parseWholeNumber(amount), parseWholeNumber(seasons));
    setError(refused);
    if (refused === null) props.onClose();
  };
  const money = (value: number) => formatMoney(value, locale);
  const name = props.playerName;
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && props.onClose()}
      title={t(buying ? "market.buyDialog.title" : "market.signDialog.title", { name })}
      description={
        buying
          ? t("market.buyDialog.description", {
              name,
              club: props.clubName ?? "",
              price: money(props.asked),
              wage: money(props.wage),
            })
          : t("market.signDialog.description", { wage: money(props.wage) })
      }
      closeLabel={t("market.dialog.close")}
      actions={
        <>
          <Button variant="ghost" onClick={props.onClose}>
            {t("market.dialog.cancel")}
          </Button>
          <Button data-testid={buying ? "confirm-buy" : "confirm-sign"} onClick={() => submit()}>
            {t(buying ? "market.dialog.confirmBuy" : "market.dialog.confirmSign")}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <Input
          inputMode="numeric"
          label={t(buying ? "market.field.fee" : "market.field.wage")}
          hint={t(buying ? "market.field.fee.hint" : "market.field.wage.hint", {
            amount: money(props.asked),
          })}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          data-testid={buying ? "fee-input" : "wage-input"}
        />
        <Input
          inputMode="numeric"
          label={t("market.field.seasons")}
          value={seasons}
          onChange={(event) => setSeasons(event.target.value)}
          data-testid="seasons-input"
        />
        {error ? (
          <p role="alert" data-testid="transfer-error" className="m-0 text-bad">
            {t(transferErrorKey(error))}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
