import { cleanup, render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card } from "./card";
import { EmptyState } from "./empty-state";
import { Skeleton } from "./skeleton";

afterEach(cleanup);

describe("Badge", () => {
  it("shows its text and uses the tone's token", () => {
    render(<Badge tone="good">Fit</Badge>);
    expect(screen.getByText("Fit").className).toContain("text-good");
  });

  it("is neutral by default", () => {
    render(<Badge>Squad</Badge>);
    expect(screen.getByText("Squad").className).toContain("text-soft");
  });
});

describe("Card", () => {
  it("renders children on the surface token with an 18 px radius", () => {
    render(<Card data-testid="card">Hello</Card>);
    const card = screen.getByTestId("card");
    expect(card.textContent).toBe("Hello");
    expect(card.className).toContain("bg-surface");
    expect(card.className).toContain("rounded-lg");
  });

  it("uses the 26 px radius for a hero card", () => {
    render(
      <Card radius="xl" data-testid="card">
        Hero
      </Card>,
    );
    expect(screen.getByTestId("card").className).toContain("rounded-xl");
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive technology", () => {
    render(<Skeleton data-testid="sk" className="h-4 w-20" />);
    expect(screen.getByTestId("sk").getAttribute("aria-hidden")).toBe("true");
  });
});

describe("EmptyState", () => {
  it("shows title, text and action, with a decorative icon", () => {
    render(
      <EmptyState
        icon={<Inbox data-testid="icon" />}
        title="No saves"
        text="Start a career first."
        action={<Button>New career</Button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "No saves" })).toBeTruthy();
    expect(screen.getByText("Start a career first.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New career" })).toBeTruthy();
    expect(screen.getByTestId("icon").closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("works with a title only", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeTruthy();
  });
});
