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
 * On Node and on Vercel's serverless runtime SvelteKit's private env is backed
 * by `process.env` anyway, so reading it directly is behaviourally equivalent for
 * every environment this package actually runs in, and it keeps the server entry
 * framework-agnostic. Same reasoning as client/utils/env.ts.
 *
 * Consequence worth knowing: SvelteKit's private env module filters out
 * variables matching `publicPrefix` and honours a custom `envPrefix`. Reading
 * `process.env` applies no such filter, so a caller could in principle read a
 * PUBLIC_-prefixed variable through here. These are server-only helpers, so that
 * is a naming nit rather than a leak -- but do not re-export them to the client.
 */
type EnvSource = Record<string, string | undefined>;
/**
 * Hand symbiont the app's environment, for frameworks where `process.env` is
 * not the whole story.
 *
 * Vite's dev server does not load `.env` into `process.env` -- SvelteKit
 * exposes it through its own env module instead -- so under `vite dev` every
 * secret read through requireEnvVar was missing, while the same code worked on
 * Vercel, where the platform populates `process.env`. Call this once at server
 * startup, in `src/hooks.server.ts`.
 *
 * SvelteKit 3: declare the variables in `src/env.ts` with `defineEnvVars`
 * (from '@sveltejs/kit/env'), then pass the module namespace:
 *
 *     import * as env from '$app/env/private';
 *     import { setEnvSource } from 'symbiont-cms/server';
 *     setEnvSource(env);
 *
 * Kit 3 validates declared variables when the app starts, and a variable
 * declared without a `schema` is required -- one missing secret takes the
 * whole site down. To keep symbiont's behaviour, where a missing secret only
 * breaks the endpoint that needs it, declare each one optional:
 * `schema: (value) => value || undefined`.
 *
 * SvelteKit 2 equivalent: `import { env } from '$env/dynamic/private'` and
 * `setEnvSource(env)`.
 *
 * The injected source is consulted first and `process.env` second, so it only
 * ever adds values; nothing that works today stops working. It keeps this
 * module framework-agnostic -- it still imports nothing from SvelteKit.
 */
export declare function setEnvSource(source: EnvSource | null): void;
/**
 * Read an environment variable (server-only).
 *
 * @param name - The environment variable name
 * @returns The environment variable value, or undefined if unset
 */
export declare function readEnvVar(name: string): string | undefined;
/**
 * Require an environment variable (server-only).
 *
 * @param name - The environment variable name
 * @param hint - Optional hint appended to the error message
 * @returns The environment variable value
 * @throws Error if the variable is missing
 */
export declare function requireEnvVar(name: string, hint?: string): string;
export {};
//# sourceMappingURL=env.d.ts.map