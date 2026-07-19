import { render, screen, waitFor } from "@testing-library/svelte";
import { vi, describe, beforeEach, it, expect } from "vitest";
import NavButtons from "./NavButtons.svelte";
import { base } from "$app/paths";
import userEvent from "@testing-library/user-event";

describe("NavButtons Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display Buttons", async () => {
    render(NavButtons);

    // Desktop buttons
    await waitFor(() => {
      expect(screen.getByTestId("docs-button")).toBeInTheDocument();
      expect(screen.getByTestId("rewards-button")).toBeInTheDocument();
    });

    // Open mobile menu
    const hamburger = screen.getByTestId("nav-hamburger");
    await userEvent.click(hamburger);

    // Mobile buttons (now visible)
    await waitFor(() => {
      expect(screen.getByTestId("docs-button-mobile")).toBeInTheDocument();
      expect(screen.getByTestId("rewards-button-mobile")).toBeInTheDocument();
    });
  });

  it("should check app button is displayed and has correct href", async () => {
    const { getByTestId } = render(NavButtons);

    const button = getByTestId("app-button");
    expect(button).toHaveAttribute("href", base + "/lock");
  });

  it("should check navigation links have correct hrefs", async () => {
    const { getByTestId } = render(NavButtons);

    const docsButton = getByTestId("docs-button");
    expect(docsButton).toHaveAttribute("href", base + "/docs");

    const rewardsButton = getByTestId("rewards-button");
    expect(rewardsButton).toHaveAttribute("href", base + "/rewards");

    const tradeButton = getByTestId("trade-button");
    expect(tradeButton).toHaveAttribute("href", base + "/trade");

    const chartButton = getByTestId("chart-button");
    expect(chartButton).toHaveAttribute("href", base + "/chart");
  });

  it("should show hamburger icon on mobile", () => {
    render(NavButtons);
    expect(screen.getByTestId("nav-hamburger")).toBeInTheDocument();
  });

  it("should open mobile menu when hamburger is clicked", async () => {
    render(NavButtons);
    const hamburger = screen.getByTestId("nav-hamburger");
    await userEvent.click(hamburger);
    expect(screen.getByTestId("docs-button-mobile")).toBeInTheDocument();
    expect(screen.getByTestId("rewards-button-mobile")).toBeInTheDocument();
  });

  it("should close mobile menu when a link is clicked", async () => {
    render(NavButtons);
    const hamburger = screen.getByTestId("nav-hamburger");
    await userEvent.click(hamburger);

    const docsLink = screen.getByTestId("docs-button-mobile");
    await userEvent.click(docsLink);

    await waitFor(() => {
      expect(
        screen.queryByTestId("docs-button-mobile"),
      ).not.toBeInTheDocument();
    });
  });

  it("should display chart button in mobile menu", async () => {
    render(NavButtons);

    // Open mobile menu
    const hamburger = screen.getByTestId("nav-hamburger");
    await userEvent.click(hamburger);

    // Check chart button is visible
    await waitFor(() => {
      expect(screen.getByTestId("chart-button-mobile")).toBeInTheDocument();
    });
  });

  it("should display chart button in desktop navigation", () => {
    render(NavButtons);
    expect(screen.getByTestId("chart-button")).toBeInTheDocument();
  });

  it("should close mobile menu when chart link is clicked", async () => {
    render(NavButtons);
    const hamburger = screen.getByTestId("nav-hamburger");
    await userEvent.click(hamburger);

    const chartLink = screen.getByTestId("chart-button-mobile");
    await userEvent.click(chartLink);

    await waitFor(() => {
      expect(
        screen.queryByTestId("chart-button-mobile"),
      ).not.toBeInTheDocument();
    });
  });
});

describe("NavButtons accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the hamburger as a labelled button whose aria-expanded tracks the menu state", async () => {
    render(NavButtons);
    const hamburger = screen.getByTestId("nav-hamburger");
    expect(hamburger.tagName).toBe("BUTTON");
    expect(hamburger).toHaveAttribute("aria-label", "Open menu");
    expect(hamburger).toHaveAttribute("aria-controls", "mobile-menu");
    expect(hamburger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(hamburger);
    expect(hamburger).toHaveAttribute("aria-expanded", "true");
  });

  it("marks the open mobile menu as a modal dialog", async () => {
    render(NavButtons);
    await userEvent.click(screen.getByTestId("nav-hamburger"));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("id", "mobile-menu");
  });

  it("gives the close button an accessible label", async () => {
    render(NavButtons);
    await userEvent.click(screen.getByTestId("nav-hamburger"));

    expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
  });

  it("closes the mobile menu when Escape is pressed", async () => {
    render(NavButtons);
    await userEvent.click(screen.getByTestId("nav-hamburger"));
    expect(screen.getByTestId("docs-button-mobile")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.queryByTestId("docs-button-mobile"),
      ).not.toBeInTheDocument();
    });
  });
});
