import type { MessageKey } from "../i18n";
import { useI18n } from "./i18n-provider";

type Props = { testId: string; titleKey: MessageKey };

/** Stands in for a screen that a later issue builds. */
export function PlaceholderScreen({ testId, titleKey }: Props) {
  const { t } = useI18n();
  return (
    <section data-testid={testId}>
      <h2>{t(titleKey)}</h2>
      <p>{t("screen.comingSoon")}</p>
    </section>
  );
}
