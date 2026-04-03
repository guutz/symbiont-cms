// Client-side exports for symbiont-cms

// Client initialization
export { createSymbiontClient } from './client.js';
export type { SymbiontClient, GetPageOptions, GetAllPagesOptions } from './client.js';

export type {
	ClassMap,
	DatabasePage,
	WebsitePage,
	FrontMatterLayout,
	TocItem,
	SyncResult,
	SymbiontConfig,
	DatabaseBlueprint,
	HydratedDatabaseConfig,
	HydratedSymbiontConfig,
	PageObjectResponse
} from './types.js';

// Hook system types
export type {
	Hook,
	HookEvent,
	HookContext,
	HookFunction
} from './hooks/types.js';

// Default hooks for reference
export { defaultHooks } from './hooks/default-hooks.js';

// Public environment utilities (client-safe)
export { requirePublicEnvVar } from './client/utils/env.js';

// Image zoom utilities (optional, requires medium-zoom to be installed separately)
export { initializeImageZoom, imageZoom } from './client/image-zoom.js';
export type { ImageZoomOptions } from './client/image-zoom.js';
