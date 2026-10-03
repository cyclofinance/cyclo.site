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

    it("validates a dirty initial amount at mount without user interaction", () => {
      const validate = vi.fn(() => "Too much");
      render(Input, { amount: "1,5e10abc", validate });

      const input = screen.getByPlaceholderText("0.0");
      expect((input as HTMLInputElement).value).toBe("1.510");
      expect(validate).toHaveBeenCalledWith("1.510");
      expect(screen.getByText("Too much")).toBeInTheDocument();
    });

    it("rejects a lone '.' initial amount at mount and leaves amount untouched", () => {
      const amountStore = writable(".");
      render(InputTest, { amount: ".", amountStore });

      const input = screen.getByPlaceholderText("0.0");
      expect((input as HTMLInputElement).value).toBe(".");
      expect(screen.getByText("Invalid amount")).toBeInTheDocument();
      expect(get(amountStore)).toBe(".");
    });

    it("clears a non-numeric initial amount at mount, writes it back and shows the error", () => {
      const amountStore = writable("abc");
      render(InputTest, { amount: "abc", amountStore });

      const input = screen.getByPlaceholderText("0.0");
      expect((input as HTMLInputElement).value).toBe("");
      expect(screen.getByText("Invalid amount")).toBeInTheDocument();
      expect(get(amountStore)).toBe("");
    });

    it("shows no error for a pristine empty mount", () => {
      render(Input, { amount: "" });

      expect(screen.queryByText("Invalid amount")).not.toBeInTheDocument();
    });

    it("treats a bound numeric 0 as the amount '0', not as empty", async () => {
      const amountStore = writable<string>("5");
      const { component } = render(InputTest, { amount: "5", amountStore });

      await act(() => component.$set({ amount: 0 as unknown as string }));

      const input = screen.getByPlaceholderText("0.0");
      expect((input as HTMLInputElement).value).toBe("0");
      expect(screen.queryByText("Invalid amount")).not.toBeInTheDocument();
      expect(get(amountStore)).toBe("0");
    });

    it("treats a numeric 0 initial amount as the amount '0', not as empty", () => {
      render(Input, { amount: 0 as unknown as string });

      const input = screen.getByPlaceholderText("0.0");
      expect((input as HTMLInputElement).value).toBe("0");
      expect(screen.queryByText("Invalid amount")).not.toBeInTheDocument();
    });
  });

  describe("typed input validation", () => {
    it("validates each typed value", async () => {
      const validate = vi.fn((value?: string) =>
        value === "." ? "Invalid amount" : undefined,
      );
      render(Input, { amount: "5", validate });
      validate.mockClear();

      const input = screen.getByPlaceholderText("0.0");
      await fireEvent.input(input, { target: { value: "." } });

      expect(validate).toHaveBeenCalledWith(".");
      expect(screen.getByText("Invalid amount")).toBeInTheDocument();

      await fireEvent.input(input, { target: { value: "7" } });

      expect(validate).toHaveBeenLastCalledWith("7");
      expect(screen.queryByText("Invalid amount")).not.toBeInTheDocument();
    });

    it("shows the default validator's error for a typed lone '.'", async () => {
      render(Input, { amount: "5" });

      const input = screen.getByPlaceholderText("0.0");
      await fireEvent.input(input, { target: { value: "." } });

      expect(screen.getByText("Invalid amount")).toBeInTheDocument();
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
