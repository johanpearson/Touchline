import { useI18n } from "./i18n-provider";
import { useCareer } from "./use-career";

export function CareerHubScreen() {
  const { t } = useI18n();
  const { career } = useCareer();
  if (!career) return null;
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  return (
    <section className="career-hub" data-testid="career-hub">
      <h2>{t("hub.title")}</h2>
      <p className="hub-club-name" data-testid="hub-club-name">
        {club?.name}
      </p>
      <p>{t("hub.league", { league: career.league.name })}</p>
      <p>{t("hub.matchday", { matchday: career.season.currentMatchday })}</p>
    </section>
  );
}
