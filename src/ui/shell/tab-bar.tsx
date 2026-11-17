import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { cn, Drawer } from "../components";
import { useI18n } from "../i18n-provider";
import { LocaleSwitch } from "../locale-switch";
import { moreItems, phoneTabItems } from "./nav-config";
import { type NavEntry, useNavEntries } from "./use-nav-entries";

const tabStyles = cn(
  "flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 px-1",
  "text-xs font-medium text-muted hover:text-text",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
  "aria-[current=page]:text-text data-[active=true]:text-text",
);

function TabLink({ entry }: { entry: NavEntry }) {
  const Icon = entry.item.icon;
  return (
    <a
      data-testid={entry.testId}
      href={entry.href}
      aria-current={entry.current ? "page" : undefined}
      className={tabStyles}
    >
      <span
        className={cn(
          "flex h-6 w-10 items-center justify-center rounded-pill",
          entry.current && "bg-raised text-(--club)",
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="max-w-full truncate">{entry.label}</span>
    </a>
  );
}

function MoreList({ onNavigate }: { onNavigate: () => void }) {
  const entries = useNavEntries(moreItems());
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {entries.map((entry) => {
        const Icon = entry.item.icon;
        return (
          <li key={entry.item.id}>
            <a
              data-testid={entry.testId}
              href={entry.href}
              aria-current={entry.current ? "page" : undefined}
              onClick={onNavigate}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 text-base text-soft hover:bg-sunk hover:text-text focus-visible:outline-2 focus-visible:outline-focus aria-[current=page]:bg-sunk aria-[current=page]:font-semibold aria-[current=page]:text-text"
            >
              <Icon aria-hidden="true" className="size-5" />
              {entry.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Phone bottom tab bar: Home, Squad, Match, League and a More button that opens a bottom sheet. */
export function TabBar() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const tabs = useNavEntries(phoneTabItems());
  const moreCurrent = useNavEntries(moreItems()).some((entry) => entry.current);
  const more = (
    <button type="button" data-testid="nav-more" data-active={moreCurrent} className={tabStyles}>
      <span className="flex h-6 w-10 items-center justify-center">
        <Ellipsis aria-hidden="true" className="size-5" />
      </span>
      <span>{t("shell.more")}</span>
    </button>
  );
  return (
    <nav
      aria-label={t("nav.label")}
      data-testid="career-nav"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-side pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex">
        {tabs.map((entry) => (
          <TabLink key={entry.item.id} entry={entry} />
        ))}
        <Drawer
          open={open}
          onOpenChange={setOpen}
          trigger={more}
          title={t("shell.more")}
          description={t("shell.moreDescription")}
          closeLabel={t("shell.close")}
        >
          <MoreList onNavigate={() => setOpen(false)} />
          <div className="flex flex-col gap-3 border-t border-line pt-4 text-soft">
            <LocaleSwitch />
          </div>
        </Drawer>
      </div>
    </nav>
  );
}
