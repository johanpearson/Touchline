import { Compass } from "lucide-react";
import { Button, EmptyState } from "./components";
import { useI18n } from "./i18n-provider";
import { hrefFor } from "./routes";

export function NotFoundScreen() {
  const { t } = useI18n();
  return (
    <section data-testid="not-found">
      <EmptyState
        icon={<Compass className="size-10" />}
        title={t("notFound.title")}
        text={t("notFound.text")}
        action={
          <Button asChild variant="primary">
            <a
              data-testid="not-found-home"
              href={hrefFor({ name: "home" })}
              className="no-underline"
            >
              {t("notFound.home")}
            </a>
          </Button>
        }
      />
    </section>
  );
}
