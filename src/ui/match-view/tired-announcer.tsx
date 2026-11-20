import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n-provider";
import type { LineupRow } from "./lineup-rows";

/**
 * A polite live region that says when a player on the pitch becomes tired, once per player for the
 * whole match. It does not announce energy ticks or the panel's content. Always mounted, so a player
 * is not announced again when the lineups panel is opened later.
 */
export function TiredAnnouncer({ rows }: { rows: readonly LineupRow[] }) {
  const { t } = useI18n();
  const announced = useRef(new Set<string>());
  const [message, setMessage] = useState("");
  useEffect(() => {
    const fresh = rows.filter((row) => row.tired && !announced.current.has(row.id));
    if (fresh.length === 0) return;
    for (const row of fresh) announced.current.add(row.id);
    setMessage(
      fresh
        .map((row) =>
          t("match.lineups.tiredAnnouncement", { player: row.name, energy: row.energy }),
        )
        .join(". "),
    );
  }, [rows, t]);
  return (
    <div role="status" aria-live="polite" className="sr-only" data-testid="tired-announcer">
      {message}
    </div>
  );
}
