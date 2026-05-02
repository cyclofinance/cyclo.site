import { render, screen, within } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import CardTest from "./CardTest.svelte";

describe("Card.svelte", () => {
  it("renders the Card component with the slot content", () => {
    render(CardTest);

    const cardElement = screen.getByTestId("card");

    const slotContent = within(cardElement).getByTestId("slot-content");
    expect(slotContent).toBeInTheDocument();
    expect(slotContent).toHaveTextContent("Card slot content");
  });

  it("applies the correct size prop to the Card component", () => {
    render(CardTest);
    const cardElement = screen.getByTestId("card");
    expect(cardElement).toHaveClass("test-class");
  });
});
