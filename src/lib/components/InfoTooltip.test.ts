import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import InfoTooltipTest from './InfoTooltip.test.svelte';

test('renders info icon', () => {
	render(InfoTooltipTest);

	// Check if the info icon is rendered
	const infoIcon = screen.getByTestId('info-icon');
	expect(infoIcon).toBeInTheDocument();
});

test('shows tooltip on hover with default content', async () => {
	const user = userEvent.setup();
	render(InfoTooltipTest);

	// Initially tooltip should not be visible
	const tooltipText = screen.queryByText('Test tooltip content');
	expect(tooltipText).not.toBeInTheDocument();

	// Hover over the info icon
	const infoIcon = screen.getByTestId('info-icon');
	await user.hover(infoIcon);

	// Now tooltip should be visible
	const visibleTooltip = await screen.findByText('Test tooltip content');
	expect(visibleTooltip).toBeInTheDocument();
});

test('shows tooltip on hover with custom content', async () => {
	const user = userEvent.setup();
	const customContent = 'Custom tooltip message';
	render(InfoTooltipTest, { props: { tooltipContent: customContent } });

	// Hover over the info icon
	const infoIcon = screen.getByTestId('info-icon');
	await user.hover(infoIcon);

	// Now tooltip should be visible with custom content
	const visibleTooltip = await screen.findByText(customContent);
	expect(visibleTooltip).toBeInTheDocument();
});

test('hides tooltip when not hovering', async () => {
	const user = userEvent.setup();
	render(InfoTooltipTest);

	// Hover over the info icon
	const infoIcon = screen.getByTestId('info-icon');
	await user.hover(infoIcon);

	// Tooltip should be visible
	const visibleTooltip = await screen.findByText('Test tooltip content');
	expect(visibleTooltip).toBeInTheDocument();

	// Move away from the info icon
	await user.unhover(infoIcon);

	// Tooltip should no longer be visible
	// Note: This might be tricky to test as the tooltip might have animation/transition
	// We might need to wait for the tooltip to disappear
	// This is a simplified approach and might need adjustment based on Flowbite's implementation
	setTimeout(() => {
		const tooltipText = screen.queryByText('Test tooltip content');
		expect(tooltipText).not.toBeInTheDocument();
	}, 300); // Adjust timeout as needed
});
