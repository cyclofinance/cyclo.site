import { render, screen } from "@testing-library/svelte";
import { vi, describe, it, expect } from "vitest";
import NavButtons from "./NavButtons.svelte";

// Non-empty base so the table exercises both base-prefixed pathnames and
// bare pathnames (where stripping the base is a no-op) against the same
// nav entries.
vi.mock("$app/paths", () => ({ base: "/cyclo", assets: "" }));

const currentPath = vi.hoisted(() => ({ value: "/" }));

vi.mock("$app/stores", async () => {
  const { readable } = await import("svelte/store");
  return {
    page: {
      subscribe(fn: (value: unknown) => void) {
        return readable({
          url: new URL(`http://localhost${currentPath.value}`),
          params: {},
        }).subscribe(fn);
      },
    },
  };
});

type ActiveMap = { app: boolean; docs: boolean; rewards: boolean };

const expectUnderline = (testId: string, active: boolean) => {
  const el = screen.getByTestId(testId);
  if (active) {
    expect(el, `${testId} should be active`).toHaveClass("underline");
  } else {
    expect(el, `${testId} should be inactive`).not.toHaveClass("underline");
  }
};

describe("NavButtons active-route detection", () => {
  const cases: [path: string, active: ActiveMap][] = [
    // trailingSlash=always pathnames without a base prefix
    ["/lock/", { app: true, docs: false, rewards: false }],
    ["/unlock/", { app: true, docs: false, rewards: false }],
    ["/docs/", { app: false, docs: true, rewards: false }],
    ["/docs/tokenomics/", { app: false, docs: true, rewards: false }],
    ["/rewards/", { app: false, docs: false, rewards: true }],
    // base-prefixed pathnames
    ["/cyclo/lock/", { app: true, docs: false, rewards: false }],
    ["/cyclo/unlock/", { app: true, docs: false, rewards: false }],
    ["/cyclo/docs/", { app: false, docs: true, rewards: false }],
    ["/cyclo/docs/guide/", { app: false, docs: true, rewards: false }],
    ["/cyclo/rewards/", { app: false, docs: false, rewards: true }],
    // routes with no active nav entry
    ["/", { app: false, docs: false, rewards: false }],
    ["/cyclo/", { app: false, docs: false, rewards: false }],
    ["/trade/", { app: false, docs: false, rewards: false }],
    ["/cyclo/trade/", { app: false, docs: false, rewards: false }],
    ["/chart/", { app: false, docs: false, rewards: false }],
    ["/cyclo/chart/", { app: false, docs: false, rewards: false }],
    // prefix look-alikes must not match
    ["/lockdown/", { app: false, docs: false, rewards: false }],
    ["/docsy/", { app: false, docs: false, rewards: false }],
  ];

  it.each(cases)("marks the right entry active for %s", (path, active) => {
    currentPath.value = path;
    render(NavButtons);

    expectUnderline("app-button", active.app);
    expectUnderline("docs-button", active.docs);
    expectUnderline("rewards-button", active.rewards);
    // Trade and Chart carry no active state on any route.
    expectUnderline("trade-button", false);
    expectUnderline("chart-button", false);
  });
});
