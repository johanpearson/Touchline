import { useI18n } from "./i18n-provider";
import { hrefFor } from "./routes";

export function NotFoundScreen() {
  const { t } = useI18n();
  return (
    <section data-testid="not-found">
      <h2>{t("notFound.title")}</h2>
      <a data-testid="not-found-home" href={hrefFor({ name: "home" })}>
        {t("notFound.home")}
      </a>
    </section>
  );
}
