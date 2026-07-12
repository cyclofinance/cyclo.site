import { render, screen, within } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import { formatUnits } from "viem";
import RewardsInfo from "./RewardsInfo.svelte";
import {
  REWARD_EPOCHS,
  DEC25_REWARD_POOL,
  JAN26_REWARD_POOL,
  FEB26_REWARD_POOL,
  MAR26_REWARD_POOL,
} from "$lib/constants";

describe("RewardsInfo Component", () => {
  it("should render RewardsInfo component", async () => {
    render(RewardsInfo);
    expect(screen.getByTestId("rewards-info")).toBeInTheDocument();
  });

  it("sources each epoch pool from the canonical reward pool constants", () => {
    expect(REWARD_EPOCHS.map((epoch) => epoch.poolRflr)).toEqual([
      DEC25_REWARD_POOL,
      JAN26_REWARD_POOL,
      FEB26_REWARD_POOL,
      MAR26_REWARD_POOL,
    ]);
  });

  it("renders one entry per epoch with the pool amount derived from its bigint constant", () => {
    render(RewardsInfo);

    const items = within(screen.getByTestId("reward-epochs")).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(REWARD_EPOCHS.length);

    REWARD_EPOCHS.forEach((epoch, i) => {
      const formattedPool = new Intl.NumberFormat("en-US").format(
        Number(formatUnits(epoch.poolRflr, 18)),
      );
      const text = (items[i].textContent ?? "").replace(/\s+/g, " ");
      expect(text).toContain(epoch.label);
      expect(text).toContain(epoch.startUtc);
      expect(text).toContain(epoch.endUtc);
      expect(text).toContain(`${formattedPool} rFLR`);
    });
  });

  it("renders the exact formatted pool strings for the current constants", () => {
    render(RewardsInfo);

    const text = (
      screen.getByTestId("reward-epochs").textContent ?? ""
    ).replace(/\s+/g, " ");
    expect(text).toContain("1,000,000 rFLR");
    expect((text.match(/500,000 rFLR/g) ?? []).length).toBe(2);
    expect(text).toContain("300,000 rFLR");
  });
});
