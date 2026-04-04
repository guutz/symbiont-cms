import type { SymbiontClient } from '../client.js';
import type { Hook } from '../hooks/types.js';

export type SyncHookMap = Record<string, Hook[]>;

export interface SymbiontSyncClient extends SymbiontClient {
	syncHooksByAlias: SyncHookMap;
}

/**
 * Wrap a standard Symbiont client with server-only hook mappings.
 *
 * Hook keys are typically database aliases. Data source IDs are also accepted
 * to support callers that prefer Notion IDs as keys.
 */
export function createSyncClient(client: SymbiontClient, hooksByAlias: SyncHookMap): SymbiontSyncClient {
	return {
		...client,
		syncHooksByAlias: hooksByAlias
	};
}
