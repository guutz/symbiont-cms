const SLOT_EVENT_MAP = {
    shouldSync: 'page:should-sync',
    isPublished: 'publish:check',
    publishDate: 'publish:date',
    addMetadata: 'metadata:add',
    transformContent: 'content:postprocess'
};
/**
 * Typed helper for large per-database sync config objects.
 */
export function defineDatabase(database) {
    return database;
}
function buildSlotHooks(syncConfig) {
    const hooks = [];
    if (syncConfig.shouldSync) {
        hooks.push({
            name: 'symbiont:slot:shouldSync',
            event: SLOT_EVENT_MAP.shouldSync,
            priority: 'override',
            fn: syncConfig.shouldSync
        });
    }
    if (syncConfig.isPublished) {
        hooks.push({
            name: 'symbiont:slot:isPublished',
            event: SLOT_EVENT_MAP.isPublished,
            priority: 'override',
            fn: syncConfig.isPublished
        });
    }
    if (syncConfig.publishDate) {
        hooks.push({
            name: 'symbiont:slot:publishDate',
            event: SLOT_EVENT_MAP.publishDate,
            priority: 'override',
            fn: syncConfig.publishDate
        });
    }
    if (syncConfig.addMetadata) {
        hooks.push({
            name: 'symbiont:slot:addMetadata',
            event: SLOT_EVENT_MAP.addMetadata,
            priority: 'override',
            fn: syncConfig.addMetadata
        });
    }
    if (syncConfig.transformContent) {
        hooks.push({
            name: 'symbiont:slot:transformContent',
            event: SLOT_EVENT_MAP.transformContent,
            priority: 'override',
            fn: (ctx) => syncConfig.transformContent(ctx)
        });
    }
    return hooks;
}
/**
 * Prevent ambiguous configuration where a slot and custom hook both define the
 * same underlying event. This is intentionally disallowed to keep behavior obvious.
 */
function assertNoSlotEventConflict(alias, syncConfig) {
    const customHooks = syncConfig.hooks ?? [];
    if (customHooks.length === 0) {
        return;
    }
    const slotEvents = new Set();
    for (const [slotName, eventName] of Object.entries(SLOT_EVENT_MAP)) {
        if (syncConfig[slotName]) {
            slotEvents.add(eventName);
        }
    }
    const conflict = customHooks.find((hook) => slotEvents.has(hook.event));
    if (conflict) {
        throw new Error(`Sync config for alias "${alias}" defines slot + hook for event "${conflict.event}". ` +
            `Use either the named slot or a custom hook for that event, not both.`);
    }
}
/**
 * Merge query-time database descriptor with server-side sync behavior.
 */
function toDatabaseBlueprint(base, syncConfig) {
    const { alias: _alias, shouldSync: _shouldSync, isPublished: _isPublished, publishDate: _publishDate, addMetadata: _addMetadata, transformContent: _transformContent, hooks: _hooks, ...syncFields } = syncConfig;
    return {
        alias: base.alias,
        dataSourceId: base.dataSourceId,
        ...syncFields
    };
}
/**
 * Resolve one database into the runtime sync blueprint + concrete hooks list.
 *
 * Resolution order:
 * 1. Look up alias in syncConfigByAlias
 * 2. Validate no slot/hook event conflict
 * 3. Compile slots to hooks
 * 4. Append custom hooks
 */
export function resolveSyncDatabase(client, queryDatabase) {
    const syncServer = client;
    const syncConfig = syncServer.syncConfigByAlias?.[queryDatabase.alias] ?? {};
    assertNoSlotEventConflict(queryDatabase.alias, syncConfig);
    const config = toDatabaseBlueprint(queryDatabase, syncConfig);
    const hooks = [...buildSlotHooks(syncConfig), ...(syncConfig.hooks ?? [])];
    return { config, hooks };
}
/**
 * Wrap a standard Symbiont client with server-only sync config.
 *
 * Named slots are hook sugar over core events. The `hooks` array remains the
 * escape hatch for side effects and event-level customization.
 *
 * Keys must match configured database aliases.
 */
export function createSymbiontServer(client, syncConfigByAlias) {
    const configuredAliases = new Set(client.config.databases.map((db) => db.alias));
    for (const [alias, syncConfig] of Object.entries(syncConfigByAlias)) {
        if (!configuredAliases.has(alias)) {
            throw new Error(`createSymbiontServer received unknown alias "${alias}"`);
        }
        if (syncConfig.alias && syncConfig.alias !== alias) {
            throw new Error(`createSymbiontServer alias mismatch: key is "${alias}" but defineDatabase alias is "${syncConfig.alias}"`);
        }
    }
    return {
        ...client,
        syncConfigByAlias
    };
}
