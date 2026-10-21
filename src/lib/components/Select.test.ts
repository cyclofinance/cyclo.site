import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import SelectTest from "./SelectTest.svelte";

type Token = { chainId: number; address: string; name: string };

const tokenLabel = (token: Token) => token.name;

// Each call returns new object identities for the same logical tokens, as a
// refetch or store reassignment does.
const makeTokens = (): Token[] => [
  { chainId: 14, address: "0xaaaa", name: "cysFLR" },
  { chainId: 14, address: "0xbbbb", name: "cyWETH" },
];

const renderSelect = <T>(
  options: T[],
  selected: T,
  getOptionLabel: (option: T) => string,
) => render(SelectTest<T>, { props: { options, selected, getOptionLabel } });

const selectUnderTest = () =>
  screen.getByTestId("select-under-test") as HTMLSelectElement;

const selectedLabel = () => screen.getByTestId("selected-label");

describe("Select", () => {
  it("keeps the selection when options are rebuilt with new identities", async () => {
    const initial = makeTokens();
    const { rerender } = renderSelect(initial, initial[1], tokenLabel);
    expect(selectedLabel()).toHaveTextContent("cyWETH");

    await rerender({ options: makeTokens() });
    expect(selectedLabel()).toHaveTextContent("cyWETH");
    // Rebound to the fresh identity so the DOM select highlights it.
    expect(selectUnderTest().selectedIndex).toBe(1);
  });

  it("keeps a user pick across a rebuild of the options", async () => {
    const initial = makeTokens();
    const { rerender } = renderSelect(initial, initial[0], tokenLabel);

    await userEvent.selectOptions(
      selectUnderTest(),
      screen.getByRole("option", { name: "cyWETH" }),
    );
    expect(selectedLabel()).toHaveTextContent("cyWETH");

    await rerender({ options: makeTokens() });
    expect(selectedLabel()).toHaveTextContent("cyWETH");
    expect(selectUnderTest().selectedIndex).toBe(1);
  });

  it("tells apart tokens that share an address across chains", async () => {
    const makeOptions = (): Token[] => [
      { chainId: 14, address: "0xaaaa", name: "cyWETH · Flare" },
      { chainId: 42161, address: "0xaaaa", name: "cyWETH · Arbitrum" },
    ];
    const initial = makeOptions();
    const { rerender } = renderSelect(initial, initial[1], tokenLabel);

    await rerender({ options: makeOptions() });
    expect(selectedLabel()).toHaveTextContent("cyWETH · Arbitrum");
    expect(selectUnderTest().selectedIndex).toBe(1);
  });

  it("matches addresses case-insensitively", async () => {
    const initial = makeTokens();
    const { rerender } = renderSelect(initial, initial[1], tokenLabel);

    await rerender({
      options: [
        { chainId: 14, address: "0xAAAA", name: "cysFLR" },
        { chainId: 14, address: "0xBBBB", name: "cyWETH" },
      ],
    });
    expect(selectedLabel()).toHaveTextContent("cyWETH");
    expect(selectUnderTest().selectedIndex).toBe(1);
  });

  it("keeps a selection keyed by value when options are rebuilt", async () => {
    type Strategy = { value: string; label: string };
    const makeOptions = (): Strategy[] => [
      { value: "DCA", label: "DCA Strategy" },
      { value: "DSF", label: "DSF Strategy" },
    ];
    const initial = makeOptions();
    const { rerender } = renderSelect(
      initial,
      initial[1],
      (option) => option.label,
    );

    await rerender({ options: makeOptions() });
    expect(selectedLabel()).toHaveTextContent("DSF Strategy");
    expect(selectUnderTest().selectedIndex).toBe(1);
  });

  it("keeps a selection keyed by id when options are rebuilt", async () => {
    type Item = { id: number; label: string };
    const makeOptions = (): Item[] => [
      { id: 1, label: "one" },
      { id: 2, label: "two" },
    ];
    const initial = makeOptions();
    const { rerender } = renderSelect(
      initial,
      initial[1],
      (option) => option.label,
    );

    await rerender({ options: makeOptions() });
    expect(selectedLabel()).toHaveTextContent("two");
    expect(selectUnderTest().selectedIndex).toBe(1);
  });

  it("resets to the first option when the selection is absent from the new options", async () => {
    const initial = makeTokens();
    const { rerender } = renderSelect(initial, initial[1], tokenLabel);

    await rerender({
      options: [
        { chainId: 14, address: "0xaaaa", name: "cysFLR" },
        { chainId: 14, address: "0xcccc", name: "cyUSDT" },
      ],
    });
    expect(selectedLabel()).toHaveTextContent("cysFLR");
    expect(selectUnderTest().selectedIndex).toBe(0);
  });

  it("defaults an unset selection to the first option", () => {
    renderSelect(makeTokens(), undefined as unknown as Token, tokenLabel);
    expect(selectedLabel()).toHaveTextContent("cysFLR");
  });

  it("keeps a falsy but valid primitive selection", () => {
    renderSelect([1, 0], 0, String);
    expect(selectedLabel()).toHaveTextContent("0");
    expect(selectUnderTest().selectedIndex).toBe(1);
  });

  it("keeps a string selection when the options array is rebuilt", async () => {
    const { rerender } = renderSelect(
      ["Buy", "Sell"],
      "Sell",
      (option) => option,
    );

    await rerender({ options: ["Buy", "Sell"] });
    expect(selectedLabel()).toHaveTextContent("Sell");
    expect(selectUnderTest().selectedIndex).toBe(1);
  });

  it("keeps keyless objects selected by reference", async () => {
    type Keyless = { label: string };
    const options: Keyless[] = [{ label: "a" }, { label: "b" }];
    const { rerender } = renderSelect(
      options,
      options[1],
      (option) => option.label,
    );

    await rerender({ options: [...options] });
    expect(selectedLabel()).toHaveTextContent("b");
    expect(selectUnderTest().selectedIndex).toBe(1);
  });
});

describe("Select with empty options", () => {
  it("keeps the selection while options are empty", async () => {
    const initial = makeTokens();
    const { rerender } = renderSelect(initial, initial[1], tokenLabel);

    await rerender({ options: [] });
    expect(selectedLabel()).toHaveTextContent("cyWETH");
    expect(screen.queryByTestId("select-under-test")).toBeNull();
  });
});
