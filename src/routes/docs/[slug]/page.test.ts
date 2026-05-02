import { mock } from "vitest-mock-extended";
import { test } from "vitest";
import { expect } from "$lib/test/matchers";
import { isHttpError, type LoadEvent } from "@sveltejs/kit";
import type { PageParentData, RouteParams } from "./$types";
import { load as pageLoad } from "./+page";
import { load as layoutLoad } from "../+layout.server";
import { render, screen } from "@testing-library/svelte";
import Page from "./+page.svelte";

test("should retrieve posts", async () => {
  const event =
    mock<LoadEvent<RouteParams, null, PageParentData, "/docs/[slug]">>();
  event.params.slug = "introduction";
  const loadreturn = await pageLoad(event);
  if (!loadreturn) return;
  const { component, frontmatter } = loadreturn;
  expect(component).toBeDefined();
  expect(frontmatter).toBeDefined();
  expect(frontmatter.title).toBe("Introduction");
});

test("should throw 404 error for a non existent slug", async () => {
  const event =
    mock<LoadEvent<RouteParams, null, PageParentData, "/docs/[slug]">>();
  event.params.slug = "not-found";
  try {
    await pageLoad(event);
  } catch (error) {
    if (!isHttpError(error)) throw error;
    expect(error.status).toBe(404);
  }
});

test("page component should render", async () => {
  const layoutData = await layoutLoad();
  const pageLoadEvent =
    mock<LoadEvent<RouteParams, null, PageParentData, "/docs/[slug]">>();
  pageLoadEvent.params.slug = "introduction";
  const pageData = await pageLoad(pageLoadEvent);
  if (!pageData) return;
  if (!layoutData) return;

  const data = { ...layoutData, ...pageData };

  render(Page, { data });

  const title = screen.getByTestId("title");
  expect(title).toHaveTextContent("Introduction");

  const body = screen.getByTestId("body");
  expect(body).toHaveTextContent(
    "Cyclo rethinks leverage from first principles.",
  );
});
