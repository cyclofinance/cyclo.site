import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import Select from "./Select.svelte";

describe("Select Component", () => {
  const options = ["alpha", "beta"];
  const getOptionLabel = (option: string) => option.toUpperCase();

  it("renders enabled by default and takes a new selection", async () => {
    render(Select, { props: { options, selected: "alpha", getOptionLabel } });

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select).not.toBeDisabled();
    expect(select).toHaveValue("alpha");

    await userEvent.selectOptions(select, "beta");
    expect(select).toHaveValue("beta");
  });

  it("is disabled when the disabled prop is set", () => {
    render(Select, {
      props: { options, selected: "alpha", getOptionLabel, disabled: true },
    });

    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
