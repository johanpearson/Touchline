import { useI18n } from "./i18n-provider";
import { hrefFor, type Route } from "./routes";
import { useCareer } from "./use-career";

export function CareerNav({ route }: { route: Route }) {
  const { t } = useI18n();
  const { career } = useCareer();
  if (!career) return null;
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const items = [
    { name: "hub", route: { name: "home" }, key: "nav.hub" },
    { name: "league", route: { name: "league" }, key: "nav.league" },
    { name: "club", route: { name: "club", clubId: career.userClubId }, key: "nav.club" },
    { name: "match", route: { name: "match" }, key: "nav.match" },
    { name: "saves", route: { name: "saves" }, key: "nav.saves" },
  ] as const;
  const isCurrent = (target: Route): boolean =>
    target.name === route.name &&
    (target.name !== "club" || (route.name === "club" && route.clubId === target.clubId));
  return (
    <nav className="career-nav" aria-label={t("nav.label")} data-testid="career-nav">
      <ul>
        {items.map((item) => (
          <li key={item.name}>
            <a
              data-testid={`nav-${item.name}`}
              href={hrefFor(item.route)}
              aria-current={isCurrent(item.route) ? "page" : undefined}
            >
              {t(item.key)}
            </a>
          </li>
        ))}
      </ul>
      <span className="nav-club-name" data-testid="nav-club-name">
        {club?.name}
      </span>
      <span className="nav-progress" data-testid="nav-progress">
        {t("nav.progress", {
          season: career.season.number,
          matchday: career.season.currentMatchday,
        })}
      </span>
    </nav>
  );
}
