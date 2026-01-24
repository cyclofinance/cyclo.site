import { test } from 'vitest';
import { expect } from '$lib/test/matchers';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Layout from './+layout.svelte';
import { load as layoutLoad } from './+layout.server';

test('should retrieve layout data', async () => {
	const data = await layoutLoad();

	expect(data).toBeDefined();
	expect(data.categorisedArticles).toBeDefined();

	expect(data.categorisedArticles[0].category).equals('Introduction');
	expect(data.categorisedArticles[0].articles[0].title).equals('Introduction');
});

test('layout component should render', async () => {
	const data = await layoutLoad();

	render(Layout, { data });

	const sideMenu = screen.getByTestId('side-menu');
	expect(sideMenu).toBeInTheDocument();

	const publishedDocTitles = screen.getAllByTestId('doc-title');
	expect(publishedDocTitles).toHaveLength(12);
});

test('should toggle mobile menu visibility on icon click', async () => {
	const data = await layoutLoad();
	const { getByTestId } = render(Layout, { data });

	const menuIcon = getByTestId('menu-icon');
	const sideMenu = getByTestId('side-menu');

	// Initially the menu should be hidden
	expect(sideMenu.classList).toContain('-left-full');
	expect(sideMenu.classList).not.toContain('left-0');

	// Click the menu icon to open the menu
	await fireEvent.click(menuIcon);
	expect(sideMenu.classList).toContain('-left-full');
	expect(sideMenu.classList).toContain('left-0');

	// Click the menu icon to close the menu
	await fireEvent.click(menuIcon);
	expect(sideMenu.classList).toContain('-left-full');
	expect(sideMenu.classList).not.toContain('left-0');
});

test('should close mobile menu when a link is clicked', async () => {
	const data = await layoutLoad();
	const { getByTestId, getAllByTestId } = render(Layout, { data });

	const menuIcon = getByTestId('menu-icon');
	const sideMenu = getByTestId('side-menu');
	const docLinks = getAllByTestId('doc-title');

	// Open the menu
	await fireEvent.click(menuIcon);
	expect(sideMenu.classList).toContain('left-0');
	expect(sideMenu.classList).toContain('-left-full');

	// Click a link to close the menu
	// First we need to remove the href attribute from the link
	// because jsdom doesn't support window.location.assign
	docLinks[0].setAttribute('href', '#');
	await fireEvent.click(docLinks[0]);
	expect(sideMenu.classList).toContain('-left-full');
	expect(sideMenu.classList).not.toContain('left-0');
});
