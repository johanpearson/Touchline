import { useCareer } from "../use-career";
import { ContinueCard, ContinueCardSkeleton, LoadErrorCard } from "./continue-card";

/** What stands in the Continue place: a skeleton while looking, the error, the card, or nothing. */
export function ContinueSlot({ nowIso }: { nowIso: string }) {
  const { continueInfo, loadError, startupChecked } = useCareer();
  if (!startupChecked) return <ContinueCardSkeleton />;
  if (loadError) return <LoadErrorCard error={loadError} />;
  if (continueInfo) return <ContinueCard info={continueInfo} nowIso={nowIso} />;
  return null;
}
