import { type ReactNode, useState } from "react";
import { Button } from "../components/button";
import { Dialog } from "../components/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/tabs";
import { useMediaQuery } from "../components/use-media-query";
import { useI18n } from "../i18n-provider";

/** Below this viewport width the side panel becomes tabs under the stage. */
export const PANEL_TABS_BELOW = 1100;

/** True when the side panel is tabs. Without `matchMedia` (tests) the wide layout is used. */
export const usePanelAsTabs = (): boolean =>
  useMediaQuery(`(max-width: ${PANEL_TABS_BELOW - 0.02}px)`);

export type MatchSidePanelProps = {
  /** Null while the half-time panel shows its own stats. */
  stats: ReactNode;
  feed: ReactNode;
  lineups: ReactNode;
};

type TabId = "stats" | "feed" | "lineups";

/**
 * Wide screens: stats and commentary stacked, the lineups in a dialog one click away. Small
 * screens: the same three as tabs (roving tabindex, arrow keys) under the stage.
 */
export function MatchSidePanel({ stats, feed, lineups }: MatchSidePanelProps) {
  const { t } = useI18n();
  const asTabs = usePanelAsTabs();
  const [tab, setTab] = useState<TabId>("stats");
  const [lineupsOpen, setLineupsOpen] = useState(false);
  const label = t("match.panel.label");

  if (asTabs) {
    return (
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as TabId)}
        data-testid="match-side-panel"
        className="min-w-0"
      >
        <TabsList aria-label={label} className="w-full">
          {(["stats", "feed", "lineups"] as const).map((id) => (
            <TabsTrigger
              key={id}
              value={id}
              data-testid={`panel-tab-${id}`}
              className="flex-1 px-2"
            >
              {t(`match.tab.${id}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="stats" className="pt-4">
          {stats}
        </TabsContent>
        <TabsContent value="feed" className="pt-4">
          {feed}
        </TabsContent>
        <TabsContent value="lineups" className="pt-4">
          {lineups}
        </TabsContent>
      </Tabs>
    );
  }
  return (
    <aside
      aria-label={label}
      data-testid="match-side-panel"
      className="flex min-w-0 flex-col gap-5 rounded-xl border border-line bg-surface p-4 min-[1100px]:sticky min-[1100px]:top-4 min-[1100px]:max-h-[calc(100svh-2rem)] min-[1100px]:self-start min-[1100px]:overflow-y-auto"
    >
      {stats}
      {feed}
      <Dialog
        open={lineupsOpen}
        onOpenChange={setLineupsOpen}
        title={t("match.lineups.title")}
        closeLabel={t("match.close")}
        trigger={
          <Button data-testid="lineups-open" variant="secondary">
            {t("match.lineups.open")}
          </Button>
        }
      >
        {lineups}
      </Dialog>
    </aside>
  );
}
