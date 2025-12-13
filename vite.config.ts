import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';
import { searchForWorkspaceRoot } from 'vite';

export default defineConfig({
	server: {
		fs: {
			allow: [
				searchForWorkspaceRoot(process.cwd()),
				// Explicitly allow cyclo.sol output directory
				'cyclo.sol/out',
			]
		}
	},
	plugins: [sveltekit(), svelteTesting()],
	define: {
		'process.env': {}
	},
	test: {
		server: {
			deps: {
				inline: ['svelte-wagmi', 'viem', 'ethers']
			}
		},
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		includeSource: ['src/**/*.{js,ts}'],
		setupFiles: ['./vitest-setup.ts']
	}
});