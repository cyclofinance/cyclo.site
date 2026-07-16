import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import SelectTest from "./SelectTest.svelte";

type Option = { id: string; label: string };

const optionKey = (option: Option) => option.id;

const makeOptions = (): Option[] => [
  { id: "cysFLR", label: "cysFLR" },
  { id: "cyWETH", label: "cyWETH" },
];

describe("Select", () => {
  it("keeps the selection when optionKey matches it in freshly constructed options", async () => {
    const initial = makeOptions();
    const { rerender } = render(SelectTest, {
      props: { options: initial, selected: initial[1], optionKey },
    });
    expect(screen.getByTestId("selected-id")).toHaveTextContent("cyWETH");

    // New array, new object identities, same logical options (a refetch).
    await rerender({ options: makeOptions() });
    expect(screen.getByTestId("selected-id")).toHaveTextContent("cyWETH");

    // selected is rebound to the fresh identity so the DOM select still
    // highlights it.
    const select = screen.getByTestId("select-under-test") as HTMLSelectElement;
    expect(select.selectedIndex).toBe(1);
  });

  it("resets to the first option when optionKey finds no match in the new options", async () => {
    const initial = makeOptions();
    const { rerender } = render(SelectTest, {
      props: { options: initial, selected: initial[1], optionKey },
    });

    await rerender({
      options: [
        { id: "cysFLR", label: "cysFLR" },
        { id: "cyUSDT", label: "cyUSDT" },
      ],
    });
    expect(screen.getByTestId("selected-id")).toHaveTextContent("cysFLR");
  });

  it("defaults an unset selection to the first option with optionKey provided", () => {
    render(SelectTest, {
      props: {
        options: makeOptions(),
        selected: undefined as unknown as Option,
        optionKey,
      },
    });
    expect(screen.getByTestId("selected-id")).toHaveTextContent("cysFLR");
  });

  it("still resets on identity change when no optionKey is given", async () => {
    const initial = makeOptions();
    const { rerender } = render(SelectTest, {
      props: { options: initial, selected: initial[1] },
    });
    expect(screen.getByTestId("selected-id")).toHaveTextContent("cyWETH");

    // Without optionKey the component falls back to reference equality, so
    // logically equal but freshly constructed options reset the selection.
    await rerender({ options: makeOptions() });
    expect(screen.getByTestId("selected-id")).toHaveTextContent("cysFLR");
  });

  it("keeps the selection by reference when the same options array is reassigned", async () => {
    const initial = makeOptions();
    const { rerender } = render(SelectTest, {
      props: { options: initial, selected: initial[1] },
    });

    await rerender({ options: initial });
    expect(screen.getByTestId("selected-id")).toHaveTextContent("cyWETH");
  });
});
