import type { Config } from 'tailwindcss';

export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/flowbite-svelte-icons/**/*.{html,js,svelte,ts}',
		'./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'
	],

	theme: {
		extend: {
			colors: {
				primary: 'var(--c-primary)',
				page: 'var(--c-page)',
				line: 'var(--c-line)',
				ink: 'var(--c-ink)',
				dim: 'var(--c-dim)',
				gain: 'var(--c-gain)',
				loss: 'var(--c-loss)'
			}
		}
	},

	plugins: [require('@tailwindcss/typography'), require('flowbite/plugin')]
} as Config;
