import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MatchSession } from "../game";
import { createMemoryLocaleStore, type MatchSessionStore } from "../platform";
import { ToastProvider } from "./components";
import { I18nProvider } from "./i18n-provider";
import { MatchSessionProvider, useMatchSessions } from "./match-session-provider";
import { MatchSessionSaveToast } from "./match-session-save-toast";

const aSession = (): MatchSession => ({ fixtureId: "f1" }) as MatchSession;

/** A store whose `save` rejects while `failing` is true. */
const aStore = (failing: { value: boolean }): MatchSessionStore => ({
  load: () => Promise.resolve({ kind: "none" }),
  save: () => (failing.value ? Promise.reject(new Error("full")) : Promise.resolve()),
  clear: () => Promise.resolve(),
});

let saveSession: (session: MatchSession) => void = () => undefined;
function Saver() {
  saveSession = useMatchSessions().save;
  return null;
}

const mount = (store: MatchSessionStore, locale?: string) =>
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <MatchSessionProvider store={store}>
        <ToastProvider dismissLabel="Dismiss" viewportLabel="Notifications">
          <MatchSessionSaveToast />
          <Saver />
        </ToastProvider>
      </MatchSessionProvider>
    </I18nProvider>,
  );

const save = async () => {
  await act(async () => {
    saveSession(aSession());
    await Promise.resolve();
  });
};

const toastCount = () => screen.queryAllByText("The match cannot be saved").length;

describe("match session save warning", () => {
  afterEach(cleanup);

  it("shows one toast when the session cannot be written, however many writes fail", async () => {
    mount(aStore({ value: true }));
    await save();
    await save();
    await save();
    await waitFor(() => expect(toastCount()).toBe(1));
  });

  it("shows nothing while writes succeed", async () => {
    mount(aStore({ value: false }));
    await save();
    await save();
    expect(toastCount()).toBe(0);
  });

  it("shows the toast again when a write fails after a successful one", async () => {
    const failing = { value: true };
    mount(aStore(failing));
    await save();
    await waitFor(() => expect(toastCount()).toBe(1));
    act(() => screen.getByRole("button", { name: "Dismiss" }).click());
    await waitFor(() => expect(toastCount()).toBe(0));

    failing.value = false;
    await save();
    failing.value = true;
    await save();

    await waitFor(() => expect(toastCount()).toBe(1));
  });

  it("says in Swedish that the match cannot be resumed after a reload", async () => {
    mount(aStore({ value: true }), "sv");
    await save();
    await waitFor(() => expect(screen.getByText("Matchen kan inte sparas")).toBeTruthy());
  });
});
