import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	define: {
		'process.env': {}
	},
	optimizeDeps: {
		include: ['sushi/router', 'sushi/currency', 'sushi/tines']
	},
	build: {
		commonjsOptions: {
			include: [/sushi\/router/, /sushi\/currency/, /sushi\/tines/]
		}
	},
	server: {
		fs: {
			// Allow serving files from the sushi package directory
			allow: [
				// Default directories
				'src',
				'node_modules',
				'.svelte-kit',
				// Add sushi package directory
				resolve(__dirname, 'lib/sushiswap/packages/sushi')
			]
		}
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
