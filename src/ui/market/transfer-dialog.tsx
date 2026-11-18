import { type FormEvent, useState } from "react";
import type { TransferError } from "../../game";
import { Button, Dialog } from "../components";
import { useI18n } from "../i18n-provider";
import { formatMoney } from "../money-format";
import { DEFAULT_SEASONS, parseWholeNumber, transferErrorKey } from "./market-status";
import { TransferFields } from "./transfer-fields";

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
        <TransferFields
          buying={buying}
          asked={props.asked}
          amount={amount}
          seasons={seasons}
          onAmount={setAmount}
          onSeasons={setSeasons}
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
