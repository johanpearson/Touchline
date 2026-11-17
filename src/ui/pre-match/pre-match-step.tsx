import { simulateFixture } from "../../game";
import { hrefFor } from "../routes";
import { useCareer } from "../use-career";
import { PreMatchScreen, type PreMatchScreenProps } from "./pre-match-screen";

type StepProps = Omit<PreMatchScreenProps, "onQuickSim">;

/** The pre-match screen wired to the career: quick sim records the result and opens the matchday results. */
export function PreMatchStep(props: StepProps) {
  const { completeMatch } = useCareer();
  const quickSim = () => {
    if (completeMatch(simulateFixture(props.career, props.fixture)) === null) {
      window.location.hash = hrefFor({ name: "results" });
    }
  };
  return <PreMatchScreen {...props} onQuickSim={quickSim} />;
}
