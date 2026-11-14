import { useMemo, useState } from "react";
import type { EngineVersion } from "../engine";
import { generateLeague } from "../game";
import { clubRating } from "./club-rating";
import { ContinuePanel } from "./continue-panel";
import { useI18n } from "./i18n-provider";
import { ImportControls } from "./import-controls";
import { hrefFor } from "./routes";
import { useCareer } from "./use-career";

type Props = { initialSeed: number };

export function NewCareerScreen({ initialSeed }: Props) {
  const { t } = useI18n();
  const { startCareer } = useCareer();
  const [seed, setSeed] = useState(initialSeed);
  const [chosen, setChosen] = useState<string | null>(null);
  const [engineVersion, setEngineVersion] = useState<EngineVersion>(1);

  const rows = useMemo(() => {
    const generated = generateLeague({ seed });
    if (!generated.ok) return [];
    const { clubs, players } = generated.league;
    return clubs
      .map((club) => ({ club, rating: clubRating(club, players) }))
      .sort((a, b) => b.rating - a.rating || a.club.name.localeCompare(b.club.name));
  }, [seed]);

  const chosenClub = rows.find((row) => row.club.id === chosen)?.club;

  const changeSeed = (text: string) => {
    const value = Number(text);
    if (text.trim() !== "" && Number.isSafeInteger(value)) setSeed(value);
  };

  const start = () => {
    if (!chosenClub) return;
    if (startCareer(seed, chosenClub.id, engineVersion) === null)
      window.location.hash = hrefFor({ name: "home" });
  };

  return (
    <section className="new-career" data-testid="new-career">
      <h2>{t("newCareer.title")}</h2>
      <ContinuePanel />
      <a data-testid="nav-saves" href={hrefFor({ name: "saves" })}>
        {t("nav.saves")}
      </a>
      <ImportControls
        onPicked={() => {
          window.location.hash = hrefFor({ name: "saves" });
        }}
      />
      <p>{t("newCareer.intro")}</p>
      <label className="seed-field">
        {t("newCareer.seed")}{" "}
        <input
          data-testid="seed-input"
          type="number"
          step={1}
          value={seed}
          onChange={(e) => changeSeed(e.target.value)}
        />
      </label>
      <label className="engine-field">
        {t("newCareer.engine")}{" "}
        <select
          data-testid="engine-version"
          value={engineVersion}
          onChange={(e) => setEngineVersion(e.target.value === "2" ? 2 : 1)}
        >
          <option value={1}>{t("newCareer.engine.1")}</option>
          <option value={2}>{t("newCareer.engine.2")}</option>
        </select>
      </label>
      <h3>{t("newCareer.clubs")}</h3>
      <ul className="club-list">
        {rows.map(({ club, rating }) => (
          <li key={club.id}>
            <button
              type="button"
              className="club-option"
              data-testid={`club-option-${club.id}`}
              aria-pressed={club.id === chosen}
              onClick={() => setChosen(club.id)}
            >
              <span
                className="club-colours"
                aria-hidden="true"
                style={{
                  background: `linear-gradient(90deg, ${club.colours.primary} 50%, ${club.colours.secondary} 50%)`,
                }}
              />
              <span className="club-name" data-testid="club-name">
                {club.name}
              </span>
              <span className="club-rating-label">{t("newCareer.rating")}</span>
              <span className="club-rating" data-testid="club-rating">
                {rating}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" data-testid="start-career" disabled={!chosenClub} onClick={start}>
        {t("newCareer.start")}
      </button>
    </section>
  );
}
