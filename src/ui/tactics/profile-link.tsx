import { UserRound } from "lucide-react";
import { useI18n } from "../i18n-provider";
import { hrefFor } from "../routes";

/** An icon link to a player's profile; it never touches the lineup. The name is for screen readers. */
export function ProfileLink(props: { playerId: string; name: string }) {
  const { t } = useI18n();
  const label = t("tactics.profile.open", { player: props.name });
  return (
    <a
      href={hrefFor({ name: "player", playerId: props.playerId })}
      data-testid={`profile-link-${props.playerId}`}
      aria-label={label}
      title={label}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-soft hover:bg-glow hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <UserRound aria-hidden="true" className="size-4" />
    </a>
  );
}
