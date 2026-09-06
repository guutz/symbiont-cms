import { type HookEvent, type HookFunction } from '../hooks/types.js';
import type { Hook } from '../hooks/types.js';
export declare function on(event: HookEvent, fn: HookFunction, options?: Pick<Hook, 'name' | 'priority' | 'continueOnError'>): Hook;
//# sourceMappingURL=hook-sugar.d.ts.map