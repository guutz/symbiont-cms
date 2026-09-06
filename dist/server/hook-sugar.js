// src/lib/server/hook-sugar.ts
import { HOOK_EVENTS } from '../hooks/types.js';
export function on(event, fn, options) {
    return {
        name: options?.name ?? `app:${event}`,
        event,
        priority: options?.priority,
        continueOnError: options?.continueOnError,
        fn
    };
}
//# sourceMappingURL=hook-sugar.js.map