// Vitest config only. This package no longer uses Vite or SvelteKit to build --
// `pnpm build` is plain `tsc -p tsconfig.build.json` (see package.json). Vite
// remains solely because Vitest is built on it.
//
// The `sveltekit()` plugin, `ssr.noExternal` and the `process.cwd` define that
// used to live here were all inherited scaffolding: there are no .svelte files
// in this package and no components are exported, so none of it did anything.
//
// `defineConfig` comes from 'vitest/config', not 'vite': the plain Vite one has
// no `test` key in its type, so adding one errors with
// "'test' does not exist in type 'UserConfigExport'".
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		/**
		 * Only run tests from source.
		 *
		 * There was no `test` config here at all, so Vitest used its defaults --
		 * and the v5 defaults no longer exclude build output. Every test file ran
		 * three times: from src/, from the compiled copy in dist/, and from
		 * .svelte-kit/__package__/. Two problems with that:
		 *
		 *   1. The compiled copies are stale until the next build, so a fix in
		 *      src/ showed up as "1 passed, 2 failed" for the same test. That is
		 *      exactly how a corrected `unified` import still reported 56
		 *      failures.
		 *   2. scripts/release.sh runs `pnpm test` before `pnpm build`, so it was
		 *      grading the previous release's artifacts.
		 *
		 * Verifying the *built* package is still worth doing -- but by loading it
		 * in a bare Node project, which is what the CI job and
		 * scripts/verify-symbiont-tag.sh (in consumers) do. Not by running stale
		 * compiled test files.
		 */
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['**/node_modules/**', 'dist/**', 'build/**']
	}
});
