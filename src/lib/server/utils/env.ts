/**
 * Server-side environment variable access, free of SvelteKit dependencies.
 *
 * This used to open with `import { env as privateEnv } from '$env/dynamic/private'`
 * and then fall back to `process.env`. The fallback was already the real code
 * path in Node contexts -- the old comment here even said so -- but the *import*
 * itself is a Vite virtual module, so it cannot resolve outside a SvelteKit
 * build. That made `symbiont-cms/server` unimportable from plain Node, and it
 * failed at load time rather than at the point of use:
 *
 *   Cannot find package '$env' imported from .../dist/server/utils/env.js
 *
 * On Node and on Vercel's serverless runtime `$env/dynamic/private` is backed by
 * `process.env` anyway, so reading it directly is behaviourally equivalent for
 * every environment this package actually runs in, and it keeps the server entry
 * framework-agnostic. Same reasoning as client/utils/env.ts.
 *
 * Consequence worth knowing: SvelteKit's `$env/dynamic/private` filters out
 * variables matching `publicPrefix` and honours a custom `envPrefix`. Reading
 * `process.env` applies no such filter, so a caller could in principle read a
 * PUBLIC_-prefixed variable through here. These are server-only helpers, so that
 * is a naming nit rather than a leak -- but do not re-export them to the client.
 */

function readFromProcess(name: string): string | undefined {
	if (typeof process === 'undefined' || !process.env) {
		return undefined;
	}
	return process.env[name];
}

/**
 * Read an environment variable (server-only).
 *
 * @param name - The environment variable name
 * @returns The environment variable value, or undefined if unset
 */
export function readEnvVar(name: string): string | undefined {
	return readFromProcess(name);
}

/**
 * Require an environment variable (server-only).
 *
 * @param name - The environment variable name
 * @param hint - Optional hint appended to the error message
 * @returns The environment variable value
 * @throws Error if the variable is missing
 */
export function requireEnvVar(name: string, hint?: string): string {
	const value = readEnvVar(name);

	if (!value) {
		const suffix = hint ? ` ${hint}` : '';
		throw new Error(`Missing required environment variable '${name}'.${suffix}`);
	}

	return value;
}
