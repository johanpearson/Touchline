import * as RadixDialog from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import { cn, EmptyState, IconButton } from "../components";
import { useOverlayMotion } from "../components/use-overlay-motion";
import { useI18n } from "../i18n-provider";
import { hrefFor } from "../routes";
import { ClubCrest } from "../shell/club-crest";
import { useTheme } from "../theme/theme-provider";
import { useCareer } from "../use-career";
import { isNavigationKey, nextActiveIndex } from "./active-index";
import { buildPaletteItems, type PaletteItem } from "./palette-items";
import { usePalette } from "./palette-provider";
import { buildSearchIndex, type GroupResult, searchPalette } from "./search";

const optionId = (listId: string, itemId: string) => `${listId}-${itemId}`;

function ResultIcon({ item }: { item: PaletteItem }) {
  if (item.crest) {
    return <ClubCrest shortName={item.crest.shortName} colours={item.crest.colours} size={28} />;
  }
  const Icon = item.icon;
  return Icon ? (
    <Icon aria-hidden="true" className="size-5 text-muted" />
  ) : (
    <span className="size-5" />
  );
}

type ResultListProps = {
  groups: GroupResult<PaletteItem>[];
  listId: string;
  activeId: string | undefined;
  onHover: (id: string) => void;
  onChoose: (item: PaletteItem) => void;
};

function ResultList({ groups, listId, activeId, onHover, onChoose }: ResultListProps) {
  const { t } = useI18n();
  return (
    <div id={listId} role="listbox" aria-label={t("palette.title")} className="flex flex-col gap-2">
      {groups.map(({ group, items }) => {
        const headingId = `${listId}-group-${group}`;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a listbox group is the ARIA pattern for grouped options
          <div key={group} role="group" aria-labelledby={headingId}>
            <div
              id={headingId}
              className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted uppercase"
            >
              {t(`palette.group.${group}`)}
            </div>
            {items.map((item) => {
              const id = optionId(listId, item.id);
              return (
                // biome-ignore lint/a11y/useKeyWithClickEvents: keys are handled by the combobox input
                <div
                  key={item.id}
                  id={id}
                  role="option"
                  tabIndex={-1}
                  aria-selected={id === activeId}
                  data-testid={`palette-option-${item.id}`}
                  onPointerMove={() => onHover(id)}
                  onClick={() => onChoose(item)}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-text",
                    "aria-selected:bg-sunk aria-selected:outline-2 aria-selected:-outline-offset-2 aria-selected:outline-focus",
                  )}
                >
                  <ResultIcon item={item} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.label}</span>
                    {item.detail ? (
                      <span className="block truncate text-[13px] text-muted">{item.detail}</span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Ctrl/Cmd+K search over screens, clubs, players and actions. */
export function CommandPalette() {
  const { open, setOpen } = usePalette();
  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <RadixDialog.Portal>{open ? <PaletteContent /> : null}</RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function PaletteContent() {
  const i18n = useI18n();
  const { t } = i18n;
  const { career } = useCareer();
  const { theme, setTheme } = useTheme();
  const { setOpen } = usePalette();
  const motionProps = useOverlayMotion();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState<string | undefined>();
  const input = useRef<HTMLInputElement>(null);
  // Radix only returns focus to a Trigger; the palette has none, so it remembers the opener.
  const [opener] = useState(() => document.activeElement);

  const index = useMemo(
    () =>
      career
        ? buildSearchIndex(buildPaletteItems({ career, translator: i18n, theme }))
        : buildSearchIndex<PaletteItem>([]),
    [career, i18n, theme],
  );
  const groups = useMemo(() => searchPalette(index, query), [index, query]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const activeItem = flat.find((item) => optionId(listId, item.id) === activeKey) ?? flat[0];
  const activeId = activeItem ? optionId(listId, activeItem.id) : undefined;

  const choose = (item: PaletteItem) => {
    setOpen(false);
    const { target } = item;
    if (target.kind === "route") window.location.hash = hrefFor(target.route);
    else if (target.kind === "theme") setTheme(target.theme);
    else i18n.setLocale(target.locale);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isNavigationKey(event.key)) {
      event.preventDefault();
      const current = activeItem ? flat.indexOf(activeItem) : -1;
      const next = flat[nextActiveIndex(current, flat.length, event.key)];
      if (next) setActiveKey(optionId(listId, next.id));
    } else if (event.key === "Enter" && activeItem) {
      event.preventDefault();
      choose(activeItem);
    }
  };

  return (
    <>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-bg/70" />
      <RadixDialog.Content
        asChild
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          input.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (opener instanceof HTMLElement) opener.focus();
        }}
      >
        <motion.div
          {...motionProps}
          data-testid="command-palette"
          className={cn(
            "fixed z-50 flex flex-col border-line bg-raised text-text shadow-xl focus:outline-none",
            "max-sm:inset-0 max-sm:h-dvh",
            "sm:top-[12vh] sm:left-1/2 sm:max-h-[70vh] sm:w-[min(40rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-xl sm:border",
          )}
        >
          <RadixDialog.Title className="sr-only">{t("palette.title")}</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">
            {t("palette.description")}
          </RadixDialog.Description>
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search aria-hidden="true" className="size-5 shrink-0 text-muted" />
            <input
              ref={input}
              data-testid="palette-input"
              // The palette handles its own Ctrl+K (it toggles), so the field is not an opt-out.
              type="text"
              role="combobox"
              aria-label={t("palette.inputLabel")}
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
              placeholder={t("palette.placeholder")}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveKey(undefined);
              }}
              onKeyDown={onKeyDown}
              className="min-h-14 min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted"
            />
            <RadixDialog.Close asChild>
              <IconButton label={t("palette.close")} icon={<X className="size-5" />} />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {flat.length > 0 ? (
              <ResultList
                groups={groups}
                listId={listId}
                activeId={activeId}
                onHover={setActiveKey}
                onChoose={choose}
              />
            ) : (
              <EmptyState
                data-testid="palette-empty"
                icon={<Search className="size-8" />}
                title={t("palette.empty", { query: query.trim() })}
                text={t("palette.emptyHint")}
              />
            )}
          </div>
          <output className="sr-only" aria-live="polite">
            {t("palette.resultCount", { count: flat.length })}
          </output>
        </motion.div>
      </RadixDialog.Content>
    </>
  );
}
