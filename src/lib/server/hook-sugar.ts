// src/lib/server/hook-sugar.ts
import { HOOK_EVENTS, type HookEvent, type HookFunction } from '../hooks/types.js'
import type { Hook } from '../hooks/types.js'

export function on(
  event: HookEvent,
  fn: HookFunction,
  options?: Pick<Hook, 'name' | 'priority' | 'continueOnError'>
): Hook {
  return {
    name: options?.name ?? `app:${event}`,
    event,
    priority: options?.priority,
    continueOnError: options?.continueOnError,
    fn
  }
}
