/**
 * Environment variable access, deliberately free of SvelteKit dependencies.
 *
 * This used to `import { env as publicEnv } from '$env/dynamic/public'`, which
 * made the module unimportable outside a SvelteKit/Vite build -- plain Node
 * consumers (tsx scripts, standalone tests, non-SvelteKit hosts) blew up on an
 * unresolvable virtual module. Reading `process.env` directly keeps symbiont-cms
 * framework-agnostic, in line with the v2.0.0 direction of being an optional
 * accessory rather than an opinionated framework.
 *
 * TRADE-OFF, on purpose: `process.env` does not exist in the browser, and Vite
 * only statically replaces `import.meta.env`. So this resolves values in Node
 * (SSR, sync jobs, scripts) and returns nothing client-side. SvelteKit apps that
 * need a public var in browser code should import it from `$env/static/public`
 * themselves and pass it into `createSymbiontClient`, which is what
 * new-california-tech does.
 *
 * NOTE: `src/lib/server/utils/env.ts` still imports `$env/dynamic/private`, so
 * the SvelteKit decoupling is only half done. Anything importing the server env
 * helper still requires a Vite context.
 */
export function requirePublicEnvVar(name, hint) {
    const value = readEnv(name);
    if (!value) {
        const suffix = hint ? ` ${hint}` : '';
        throw new Error(`Missing required public environment variable '${name}'.${suffix}` +
            ` (Note: this reads process.env and therefore resolves only outside the browser.` +
            ` In client code, pass the value into createSymbiontClient instead.)`);
    }
    return value;
}
function readEnv(name) {
    if (typeof process === 'undefined' || !process.env) {
        return undefined;
    }
    return process.env[name];
}
//# sourceMappingURL=env.js.map