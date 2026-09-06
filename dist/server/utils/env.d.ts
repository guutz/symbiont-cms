/**
 * Read an environment variable (server-only).
 * Tries SvelteKit's dynamic env first, then falls back to process.env.
 *
 * @param name - The environment variable name
 * @returns The environment variable value or undefined
 */
export declare function readEnvVar(name: string): string | undefined;
/**
 * Require an environment variable (server-only).
 *
 * @param name - The environment variable name
 * @param hint - Optional hint for error message
 * @returns The environment variable value
 * @throws Error if the variable is missing
 */
export declare function requireEnvVar(name: string, hint?: string): string;
//# sourceMappingURL=env.d.ts.map