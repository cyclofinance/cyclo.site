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

  it("sanitizes protocol-relative //evil.com href to #", () => {
    render(HrefButton, { props: { href: "//evil.com" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "#");
  });

  it("sanitizes backslash protocol-relative /\\evil.com href to #", () => {
    render(HrefButton, { props: { href: "/\\evil.com" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "#");
  });

  it("sanitizes ///evil.com href to #", () => {
    render(HrefButton, { props: { href: "///evil.com" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "#");
  });

  it("sanitizes whitespace-prefixed protocol-relative href to #", () => {
    render(HrefButton, { props: { href: " //evil.com" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "#");
  });

  it("sanitizes tab-injected protocol-relative /\\t/evil.com href to #", () => {
    render(HrefButton, { props: { href: "/\t/evil.com" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "#");
  });

  it("sanitizes newline-injected protocol-relative href to #", () => {
    render(HrefButton, { props: { href: "/\n\\evil.com" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "#");
  });

  it("sanitizes CR-injected protocol-relative href to #", () => {
    render(HrefButton, { props: { href: "/\r\\evil.com" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "#");
  });

  it("sanitizes backslash-prefixed \\\\evil.com href to #", () => {
    render(HrefButton, { props: { href: "\\\\evil.com" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "#");
  });

  it("preserves single-slash /docs href unchanged", () => {
    render(HrefButton, { props: { href: "/docs" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "/docs");
  });

  it("preserves relative href with surrounding whitespace trimmed", () => {
    render(HrefButton, { props: { href: " /docs " } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "/docs");
  });

  it("renders relative href with interior tab deleted", () => {
    render(HrefButton, { props: { href: "/do\tcs" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "/docs");
  });

  it("renders https href with interior newline deleted", () => {
    render(HrefButton, { props: { href: "https://exam\nple.com" } });
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("preserves fragment-only href unchanged", () => {
    render(HrefButton, { props: { href: "#section" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "#section");
  });

  it("preserves query-only href unchanged", () => {
    render(HrefButton, { props: { href: "?tab=1" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "?tab=1");
  });

  it("preserves mailto: href unchanged", () => {
    render(HrefButton, { props: { href: "mailto:hi@example.com" } });
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "mailto:hi@example.com",
    );
  });

  it("preserves http: href unchanged", () => {
    render(HrefButton, { props: { href: "http://example.com" } });
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "http://example.com",
    );
  });

  it("preserves upper-case HTTPS: scheme unchanged", () => {
    render(HrefButton, { props: { href: "HTTPS://EXAMPLE.COM" } });
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "HTTPS://EXAMPLE.COM",
    );
  });

  it("sanitizes javascript: href carrying an allowed scheme later in the string", () => {
    render(HrefButton, { props: { href: "javascript:alert(1)//https://x" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "#");
  });

  it("passes caller rel through unchanged without target=_blank", () => {
    render(HrefButton, {
      props: { href: "https://example.com", rel: "author" },
    });
    expect(screen.getByRole("link")).toHaveAttribute("rel", "author");
  });

  it("adds noopener noreferrer rel when target=_blank", () => {
    render(HrefButton, {
      props: { href: "https://example.com", target: "_blank" },
    });
    expect(screen.getByRole("link")).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("preserves caller-supplied rel alongside blank tokens", () => {
    render(HrefButton, {
      props: { href: "https://example.com", target: "_blank", rel: "author" },
    });
    expect(screen.getByRole("link")).toHaveAttribute(
      "rel",
      "noopener noreferrer author",
    );
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
