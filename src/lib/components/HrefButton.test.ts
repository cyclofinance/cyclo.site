import { render, screen } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import HrefButton from "./HrefButton.svelte";

describe("Href Button Component", () => {
  it("sanitizes javascript: href to #", () => {
    render(HrefButton, { props: { href: "javascript:alert(1)" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "#");
  });

  it("sanitizes data: href to #", () => {
    render(HrefButton, { props: { href: "data:text/html,<h1>x</h1>" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "#");
  });

  it("preserves https: href unchanged", () => {
    render(HrefButton, { props: { href: "https://example.com" } });
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("preserves relative href unchanged", () => {
    render(HrefButton, { props: { href: "/foo/bar" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "/foo/bar");
  });

  it("adds noopener noreferrer rel when target=_blank", () => {
    render(HrefButton, {
      props: { href: "https://example.com", target: "_blank" },
    });
    const link = screen.getByRole("link");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("preserves caller-supplied rel alongside blank tokens", () => {
    render(HrefButton, {
      props: { href: "https://example.com", target: "_blank", rel: "author" },
    });
    const rel = screen.getByRole("link").getAttribute("rel") ?? "";
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
    expect(rel).toContain("author");
  });

  it('should render with default class as "outset"', () => {
    render(HrefButton, {
      props: { inset: false, href: "https://www.google.com" },
    });

    const button = screen.getByRole("link");

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("outset");
    expect(button).not.toHaveClass("inset");
  });

  it('should render with "inset" class when inset is true', () => {
    render(HrefButton, {
      props: { inset: true, href: "https://www.google.com" },
    });

    const button = screen.getByRole("link");

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("inset");
    expect(button).not.toHaveClass("outset");
  });
});
