import type { ReactNode } from "react";
import { Redirect } from "../redirect";
import { hrefFor } from "../routes";
import { ClubStep } from "./club-step";
import { previewLeague } from "./league-preview";
import { LeagueStep } from "./league-step";
import { useNewCareerWizard } from "./use-new-career-wizard";

type NewCareerWizardProps = { step: "league" | "club"; initialSeed: number };

/**
 * The new-career wizard. It owns the choices in memory, so moving between the two steps (and
 * Back) keeps them; the club step cannot be opened before a league has been chosen.
 */
export function NewCareerWizard({ step, initialSeed }: NewCareerWizardProps) {
  const wizard = useNewCareerWizard(initialSeed);
  if (step === "club") {
    if (wizard.leagueId === null) return <Redirect to={{ name: "new" }} />;
    return (
      <Frame>
        <ClubStep seed={wizard.seed} onSeedChange={wizard.setSeed} />
      </Frame>
    );
  }
  const preview = previewLeague(wizard.seed);
  if (!preview) return null;
  const goToClubStep = (leagueId: string) => {
    wizard.chooseLeague(leagueId);
    window.location.hash = hrefFor({ name: "new-club" });
  };
  return (
    <Frame>
      <LeagueStep
        preview={preview}
        leagueId={wizard.leagueId}
        onChoose={wizard.chooseLeague}
        onContinue={goToClubStep}
      />
    </Frame>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto box-border w-full max-w-[1200px] px-4 py-4 sm:px-10">{children}</div>
  );
}
