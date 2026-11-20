import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  MatchLockProvider,
  panelOfRoute,
  panelOpener,
  useLockMatch,
  useMatchLock,
} from "./match-lock";

afterEach(cleanup);

function Match({ active }: { active: boolean }) {
  useLockMatch(active);
  return null;
}

function State() {
  const lock = useMatchLock();
  const open = panelOpener(lock, { name: "squad" });
  const leave = panelOpener(lock, { name: "league" });
  return (
    <div>
      <p data-testid="locked">{String(lock.locked)}</p>
      <p data-testid="panel">{lock.panel ?? "none"}</p>
      <p data-testid="opener">{open ? "yes" : "no"}</p>
      <p data-testid="league-opener">{leave ? "yes" : "no"}</p>
      <button type="button" onClick={() => open?.()}>
        open
      </button>
    </div>
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

describe("match lock", () => {
  it("is not locked without a match, and panel links navigate as usual", () => {
    render(
      <MatchLockProvider>
        <State />
      </MatchLockProvider>,
    );
    expect(text("locked")).toBe("false");
    expect(text("opener")).toBe("no");
  });

  it("locks while a match runs, so squad and tactics links open panels but other links do not", () => {
    render(
      <MatchLockProvider>
        <Match active />
        <State />
      </MatchLockProvider>,
    );
    expect(text("locked")).toBe("true");
    expect(text("opener")).toBe("yes");
    expect(text("league-opener")).toBe("no");
  });

  it("opens a panel and closes it again when the match is over", () => {
    const view = render(
      <MatchLockProvider>
        <Match active />
        <State />
      </MatchLockProvider>,
    );
    act(() => screen.getByText("open").click());
    expect(text("panel")).toBe("squad");
    view.rerender(
      <MatchLockProvider>
        <Match active={false} />
        <State />
      </MatchLockProvider>,
    );
    expect(text("locked")).toBe("false");
    expect(text("panel")).toBe("none");
  });

  it("knows which routes are panels", () => {
    expect(panelOfRoute({ name: "squad" })).toBe("squad");
    expect(panelOfRoute({ name: "tactics" })).toBe("tactics");
    expect(panelOfRoute({ name: "home" })).toBeNull();
  });

  it("does nothing without a provider", () => {
    render(<State />);
    expect(text("locked")).toBe("false");
  });
});
