import { useState } from "react";
import type { Career } from "../game";
import { FixturesView } from "./fixtures-view";
import { useI18n } from "./i18n-provider";
import { LeagueTable } from "./league-table";
import { useCareer } from "./use-career";

type Tab = "table" | "fixtures";

export function LeagueView({ career }: { career: Career }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("table");
  return (
    <section data-testid="screen-league">
      <h2>{career.league.name}</h2>
      <div role="tablist" aria-label={t("league.tabs")} className="league-tabs">
        {(["table", "fixtures"] as const).map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`tab-${name}`}
            data-testid={`tab-${name}`}
            aria-selected={tab === name}
            aria-controls={`panel-${name}`}
            onClick={() => setTab(name)}
          >
            {t(`league.tab.${name}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "table" ? <LeagueTable career={career} /> : <FixturesView career={career} />}
      </div>
    </section>
  );
}

export function LeagueScreen() {
  const { career } = useCareer();
  return career ? <LeagueView career={career} /> : null;
}
