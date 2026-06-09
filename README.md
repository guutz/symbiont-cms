# Symbiont CMS

Symbiont CMS is a Notion-to-database content pipeline for SvelteKit projects.
It syncs content from Notion into Supabase, gives you typed query helpers for your app, and includes server-side markdown rendering utilities.

## What it provides

- Notion -> Supabase sync with a hook-based pipeline
- Typed client for querying pages from your app (`getPageBySlug`, `getAllPages`)
- Server utilities for polling/webhook sync handlers
- Markdown rendering (`renderMarkdownToHtml`, `renderSummaryToHtml`)

## Installation

```bash
pnpm add symbiont-cms
```

For tag-based GitHub installs:

```bash
pnpm add github:guutz/symbiont-cms#v1.0.0
```

## Quick start

Create a query client once in your app.

```ts
// src/lib/symbiont.ts
import { createSymbiontClient } from 'symbiont-cms';

export const symbiont = createSymbiontClient({
  supabase: {
    url: process.env.PUBLIC_SUPABASE_URL!,
    publishableKey: process.env.PUBLIC_SUPABASE_ANON_KEY!
  },
  databases: [
    {
      alias: 'blog',
      dataSourceId: process.env.NOTION_DATABASE_ID!
    }
  ]
});
```

Use it in server load functions.

```ts
// src/routes/[slug]/+page.server.ts
import { symbiont } from '$lib/symbiont';

export const load = async ({ params, fetch }) => {
  const post = await symbiont.getPageBySlug(params.slug, { fetch, alias: 'blog' });
  return { post };
};
```

Use sync handlers in API routes.

```ts
// src/routes/api/sync/+server.ts
import { handlePollBlogRequest } from 'symbiont-cms/server';
import { symbiont } from '$lib/symbiont';
import { symbiontSync } from '$lib/symbiont.server';

export const GET = (event) => handlePollBlogRequest(symbiontSync, event);
```

Define sync behavior separately (slot-first config + hook sugar escape hatch).

```ts
// src/lib/symbiont.server.ts
import { createSymbiontServer, on } from 'symbiont-cms/server';
import { symbiont } from './symbiont.js';

export const symbiontSync = createSymbiontServer(symbiont, {
  blog: {
    slugProperty: 'Slug',
    tagsProperty: 'Tags',
    authorsProperty: 'Authors',
    summaryProperty: 'Summary',
    coverProperty: 'Cover',

    shouldSync: (ctx) => ctx.page.archived !== true,
    isPublished: (ctx) => ctx.page.properties.Status?.status?.name === 'Published',
    publishDate: (ctx) => ctx.page.properties['Publish Date']?.date?.start ?? null,
    addMetadata: () => ({ siteSection: 'blog' }),
    transformContent: (ctx) => ctx.input,

    hooks: [
      on('content:sync', async (ctx) => {
        ctx.logger.debug({ event: 'content_synced', pageId: ctx.page.id });
        return null;
      }, { name: 'blog:content-sync-log', priority: 'after' })
    ]
  }
});
```

## Minimal sample config

```ts
// src/lib/symbiont.ts
import { createSymbiontClient } from 'symbiont-cms';

export const symbiont = createSymbiontClient({
  supabase: {
    url: process.env.PUBLIC_SUPABASE_URL!,
    publishableKey: process.env.PUBLIC_SUPABASE_ANON_KEY!
  },
  databases: [
    {
      alias: 'blog',
      dataSourceId: process.env.NOTION_DATABASE_ID!
    }
  ]
});
```

Symbiont does not auto-load an external config file when creating a client.
The intended path is to call `createSymbiontClient(...)` in `src/lib/symbiont.ts` and export that singleton.

## Full sample config (query + sync)

```ts
// src/lib/symbiont.ts
import { createSymbiontClient } from 'symbiont-cms';

export const symbiont = createSymbiontClient({
  supabase: {
    url: process.env.PUBLIC_SUPABASE_URL!,
    publishableKey: process.env.PUBLIC_SUPABASE_ANON_KEY!
  },

  databases: [
    {
      alias: 'blog',
      dataSourceId: process.env.NOTION_DATABASE_ID!
    }
  ],

  markdown: {
    math: {
      enabled: true,
      inlineDelimiters: ['$$', '$$'],
      displayDelimiters: ['$$', '$$']
    },
    toc: {
      enabled: true,
      minHeadingLevel: 2,
      maxHeadingLevel: 4
    },
    extensions: {
      footnotes: true,
      spoilers: true,
      highlights: true,
      textColors: true,
      gfm: true
    },
    images: {
      lazy: true
    }
  },

  caching: {
    strategy: 'isr', // 'isr' | 'none'
    isr: {
      enabled: true,
      revalidate: 300
    }
  }
});

// src/lib/symbiont.server.ts
import { createSymbiontServer } from 'symbiont-cms/server';
import { symbiont } from './symbiont.js';

export const symbiontSync = createSymbiontServer(symbiont, {
  blog: {
    // Slug behavior
    slugProperty: 'Slug',
    onSlugConflict: 'auto-rename',

    // Lifecycle
    onBeforeSync: async () => {},
    onAfterSync: async () => {},

    // Metadata mappings
    tagsProperty: 'Tags',
    authorsProperty: 'Authors',
    summaryProperty: 'Summary',
    coverProperty: 'Cover',

    // Content source behavior
    contentSourceRule: 'NOTION',

    // Notion write-back strategy
    syncStrategy: 'patch',
    forceFullReplaceThreshold: 0.6,
    syncBackToNotion: { content: true, properties: true },

    // Named slots (hook sugar)
    shouldSync: () => true,
    isPublished: (ctx) => ctx.page.properties.Status?.status?.name === 'Published',
    publishDate: (ctx) => ctx.page.last_edited_time,
    addMetadata: () => ({}),
    transformContent: (ctx) => ctx.input,

    // Escape hatch
    hooks: []
  }
});
```

## Exports

- `symbiont-cms`: client APIs, types, optional Svelte components
- `symbiont-cms/server`: sync handlers and server-only utilities

## Migration (Major)

This release intentionally introduces breaking API changes.

- `createSymbiontClient(...).databases` is now query-only:
  - keep `alias` + `dataSourceId`
  - move sync behavior to `createSymbiontServer(...)`
- `createSymbiontServer` now accepts `SyncConfigMap` (slot-first), not `Record<string, Hook[]>`
- Prefer named slots for common behavior:
  - `shouldSync`, `isPublished`, `publishDate`, `addMetadata`, `transformContent`
- Use `hooks` as the event-level escape hatch for side effects and uncommon events
- Slot + hook on the same underlying event is disallowed and throws at config resolution
- Use `on(EVENTS.someEvent, fn)` for typed hook sugar when writing custom hooks

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm check
```

## Versioning and releases

This package is intended to support lightweight tag-based releases.
For release flow details, see the repository docs and release playbook.
