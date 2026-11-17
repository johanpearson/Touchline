import { useState } from "react";
import type { Career } from "../game";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components";
import { FixturesView } from "./fixtures-view";
import { useI18n } from "./i18n-provider";
import { type LeagueTab, loadLeagueTab, saveLeagueTab } from "./league-tab-session";
import { LeagueTable } from "./league-table";
import { useCareer } from "./use-career";

const TABS: readonly LeagueTab[] = ["table", "fixtures"];

export function LeagueView({ career }: { career: Career }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<LeagueTab>(loadLeagueTab);
  const change = (value: string) => {
    const next = value === "fixtures" ? "fixtures" : "table";
    saveLeagueTab(next);
    setTab(next);
  };
  return (
    <section data-testid="screen-league" className="flex flex-col gap-4">
      <h2 className="m-0 font-heading text-3xl text-text">{career.league.name}</h2>
      <Tabs value={tab} onValueChange={change} className="flex flex-col gap-4">
        <TabsList aria-label={t("league.tabs")}>
          {TABS.map((name) => (
            <TabsTrigger key={name} value={name} data-testid={`tab-${name}`}>
              {t(`league.tab.${name}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="table">
          <LeagueTable career={career} />
        </TabsContent>
        <TabsContent value="fixtures">
          <FixturesView career={career} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

export function LeagueScreen() {
  const { career } = useCareer();
  return career ? <LeagueView career={career} /> : null;
}
