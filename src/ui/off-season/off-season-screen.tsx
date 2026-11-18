import { Redirect } from "../redirect";
import { hrefFor } from "../routes";
import { useCareer } from "../use-career";
import { isOffSeason } from "./off-season-status";
import { OffSeasonView } from "./off-season-view";

/** The off-season route. Outside the window (a running season, or a season not yet finished) it leads back to the hub. */
export function OffSeasonScreen() {
  const { career, renewContract, startNextSeason } = useCareer();
  if (!career || !isOffSeason(career)) return <Redirect to={{ name: "home" }} />;
  const start = () => {
    if (startNextSeason() === null) window.location.hash = hrefFor({ name: "home" });
  };
  return <OffSeasonView career={career} onRenew={renewContract} onStart={start} />;
}
