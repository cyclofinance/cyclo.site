import { render, screen, fireEvent, act } from "@testing-library/svelte";
import { writable, get } from "svelte/store";
import Input from "./Input.svelte";
import InputTest from "./InputTest.svelte";
import { describe, it, expect, vi } from "vitest";

describe("Input", () => {
  it("renders the input field and unit", () => {
    render(Input, { amount: "0.0", unit: "FLR", maxButton: true });

    const input = screen.getByPlaceholderText("0.0");
    const unit = screen.getByText("FLR");
    const maxButton = screen.getByText("MAX");

    expect(input).toBeInTheDocument();
    expect(unit).toBeInTheDocument();
    expect(maxButton).toBeInTheDocument();
  });

  describe("decimal separator handling", () => {
    it("converts comma to dot", async () => {
      const mockDispatch = vi.fn();
      const { component } = render(Input, { amount: "0.0" });
      component.$on("input", mockDispatch);

      const input = screen.getByPlaceholderText("0.0");
      await fireEvent.input(input, { target: { value: "10,5" } });

      expect((input as HTMLInputElement).value).toBe("10.5");
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { value: "10.5" },
        }),
      );
    });

    it("removes multiple separators", async () => {
      const mockDispatch = vi.fn();
      const { component } = render(Input, { amount: "0.0" });
      component.$on("input", mockDispatch);

      const input = screen.getByPlaceholderText("0.0");
      await fireEvent.input(input, { target: { value: "10.5.6" } });

      expect((input as HTMLInputElement).value).toBe("105.6");
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { value: "105.6" },
        }),
      );
    });

    it("removes non-numeric characters", async () => {
      const mockDispatch = vi.fn();
      const { component } = render(Input, { amount: "0.0" });
      component.$on("input", mockDispatch);

      const input = screen.getByPlaceholderText("0.0");
      await fireEvent.input(input, { target: { value: "abc12.3xyz" } });

      expect((input as HTMLInputElement).value).toBe("12.3");
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { value: "12.3" },
        }),
      );
    });

    it("handles mixed separators", async () => {
      const mockDispatch = vi.fn();
      const { component } = render(Input, { amount: "0.0" });
      component.$on("input", mockDispatch);

      const input = screen.getByPlaceholderText("0.0");
      await fireEvent.input(input, { target: { value: "10.5,6" } });

      expect((input as HTMLInputElement).value).toBe("10.56");
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { value: "10.56" },
        }),
      );
    });

    it("preserves leading zeros", async () => {
      const mockDispatch = vi.fn();
      const { component } = render(Input, { amount: "0.0" });
      component.$on("input", mockDispatch);

      const input = screen.getByPlaceholderText("0.0");
      await fireEvent.input(input, { target: { value: "00.5" } });

      expect((input as HTMLInputElement).value).toBe("00.5");
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { value: "00.5" },
        }),
      );
    });
  });

  describe("external amount updates", () => {
    it("sanitizes the initial amount through handleDecimalSeparator", () => {
      render(Input, { amount: "1,5" });

      const input = screen.getByPlaceholderText("0.0");
      expect((input as HTMLInputElement).value).toBe("1.5");
    });

    it("routes programmatic bind:amount updates through handleDecimalSeparator", async () => {
      const amountStore = writable("5");
      const { component } = render(InputTest, { amount: "5", amountStore });

      const input = screen.getByPlaceholderText("0.0");
      expect((input as HTMLInputElement).value).toBe("5");

      await act(() => component.$set({ amount: "1,5e10abc" }));

      expect((input as HTMLInputElement).value).toBe("1.510");
      expect(get(amountStore)).toBe("1.510");
    });
  });

  describe("default validator", () => {
    it("rejects a lone '.' set via bind:amount and leaves amount untouched", async () => {
      const amountStore = writable("5");
      const { component } = render(InputTest, { amount: "5", amountStore });

      await act(() => component.$set({ amount: "." }));

      expect(screen.getByText("Invalid amount")).toBeInTheDocument();
      expect(get(amountStore)).toBe(".");
    });

    it("rejects an empty string set via bind:amount and leaves amount untouched", async () => {
      const amountStore = writable("5");
      const { component } = render(InputTest, { amount: "5", amountStore });

      await act(() => component.$set({ amount: "" }));

      expect(screen.getByText("Invalid amount")).toBeInTheDocument();
      expect(get(amountStore)).toBe("");
    });
  });

  it("dispatches setValueToMax event when MAX button is clicked", async () => {
    const mockDispatch = vi.fn();
    const { component } = render(Input, { amount: "0.0", maxButton: true });
    component.$on("setValueToMax", mockDispatch);

    const maxButton = screen.getByText("MAX");
    await fireEvent.click(maxButton);

    expect(mockDispatch).toHaveBeenCalled();
  });
});
