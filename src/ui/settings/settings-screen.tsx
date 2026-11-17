import { type ReactNode, useId } from "react";
import { isLocale, locales } from "../../i18n";
import { isPreferenceStorageWritable } from "../../platform";
import { Card, SegmentedControl } from "../components";
import { useMediaQuery } from "../components/use-media-query";
import { useI18n } from "../i18n-provider";
import { DENSITIES, isDensity } from "../theme/density";
import { useDensity } from "../theme/density-provider";
import { ThemeCards } from "./theme-cards";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function Section(props: { title: string; hint: string; children: ReactNode; testId?: string }) {
  const headingId = useId();
  return (
    <Card
      tone="surface"
      padding="lg"
      className="flex flex-col gap-4"
      data-testid={props.testId}
      role="group"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="m-0 font-heading text-2xl font-semibold">
          {props.title}
        </h2>
        <p className="m-0 text-[13px] text-muted">{props.hint}</p>
      </div>
      {props.children}
    </Card>
  );
}

function LanguageSection() {
  const { t, locale, setLocale } = useI18n();
  return (
    <Section title={t("settings.language.title")} hint={t("settings.language.hint")}>
      <SegmentedControl
        label={t("locale.label")}
        value={locale}
        options={locales.map((l) => ({ value: l, label: t(`locale.${l}`) }))}
        onValueChange={(next) => {
          if (isLocale(next)) setLocale(next);
        }}
        className="self-start"
      />
    </Section>
  );
}

function DensitySection() {
  const { t } = useI18n();
  const { density, setDensity } = useDensity();
  return (
    <Section title={t("settings.density.title")} hint={t("settings.density.hint")}>
      <SegmentedControl
        label={t("settings.density.group")}
        value={density}
        options={DENSITIES.map((d) => ({ value: d, label: t(`settings.density.${d}`) }))}
        onValueChange={(next) => {
          if (isDensity(next)) setDensity(next);
        }}
        className="self-start"
      />
    </Section>
  );
}

function Notice(props: { testId: string; title?: string; children: ReactNode }) {
  return (
    <output
      data-testid={props.testId}
      className="block rounded-lg border border-line bg-raised p-4 text-[15px] text-soft"
    >
      {props.title ? <strong className="block text-text">{props.title}</strong> : null}
      {props.children}
    </output>
  );
}

type Props = {
  /** False when the browser blocks storage: choices then last for the session only. */
  preferencesPersist?: boolean;
};

/** `#/settings`: language, theme, table density and a note about motion and storage. */
export function SettingsScreen({ preferencesPersist = isPreferenceStorageWritable() }: Props) {
  const { t } = useI18n();
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  return (
    <section data-testid="settings-screen" className="flex max-w-[860px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-heading text-[40px] leading-none font-bold">
          {t("settings.title")}
        </h1>
        <p className="m-0 text-muted">{t("settings.intro")}</p>
      </div>
      {preferencesPersist ? null : (
        <Notice testId="settings-storage-notice" title={t("settings.storage.title")}>
          {t("settings.storage.text")}
        </Notice>
      )}
      <LanguageSection />
      <Section title={t("settings.theme.title")} hint={t("settings.theme.hint")}>
        <ThemeCards />
      </Section>
      <DensitySection />
      {reducedMotion ? (
        <Notice testId="settings-motion-note" title={t("settings.motion.title")}>
          {t("settings.motion.reduced")}
        </Notice>
      ) : null}
    </section>
  );
}
