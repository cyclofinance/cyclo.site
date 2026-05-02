import { render, screen } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import Button from "./Button.svelte";

describe("Button Component", () => {
  it('should render with default class as "outset"', () => {
    render(Button, { props: { inset: false } });

    const button = screen.getByRole("button");

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("outset");
    expect(button).not.toHaveClass("inset");
  });

  it('should render with "inset" class when inset is true', () => {
    render(Button, { props: { inset: true } });

    const button = screen.getByRole("button");

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("inset");
    expect(button).not.toHaveClass("outset");
  });

  it("should be disabled when disabled attribute is set", () => {
    render(Button, { props: { disabled: true } });

    const button = screen.getByRole("button");

    expect(button).toBeDisabled();
  });
});
