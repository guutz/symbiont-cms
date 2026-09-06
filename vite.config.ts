import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		noExternal: ['symbiont-cms']
	},
	define: {
		// Ensure process.cwd() works in server context
		'process.cwd': 'process.cwd'
	},
	test: {
		/**
		 * Only run tests from source.
		 *
		 * There was no `test` config here, so Vitest used its defaults -- and the
		 * v5 defaults no longer exclude build output. That meant every test file
		 * ran THREE times: once from src/, once from the compiled copy in dist/,
		 * and once from .svelte-kit/__package__/. Three problems with that:
		 *
		 *   1. The dist/ and __package__/ copies are stale until the next build,
		 *      so a fix in src/ shows up as "1 passed, 2 failed" for the same
		 *      test. That is exactly how a corrected `unified` import still
		 *      reported 56 failures.
		 *   2. scripts/release.sh runs `pnpm test` BEFORE `pnpm build`, so it was
		 *      grading the previous release's artifacts.
		 *   3. It tripled the suite's runtime for no coverage.
		 *
		 * Verifying the *built* package is still worth doing, but stale compiled
		 * test files are not how -- CI loads the built output in a bare Node
		 * project instead (see .github/workflows/ci.yml).
		 */
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['**/node_modules/**', 'dist/**', '.svelte-kit/**', 'build/**']
	}
});
