# Symbiont CMS

Symbiont CMS is a Notion-to-database content pipeline for SvelteKit projects.
It syncs content from Notion into Supabase, gives you typed query helpers for your app, and includes server-side markdown rendering utilities.

## What it provides

- Notion -> Supabase sync with a hook-based pipeline
- Typed client for querying pages from your app (`getPageBySlug`, `getAllPages`)
- Server utilities for polling/webhook sync handlers
- Markdown rendering (`renderMarkdownToHtml`, `renderSummaryToHtml`)

## Installation

Symbiont is not on npm. Install it from a release tag on GitHub:

```bash
pnpm add github:guutz/symbiont-cms#v1.3.1
```

pnpm refuses to install git-hosted packages until their build is approved,
even though this one has no build script. Approve it in `pnpm-workspace.yaml`,
using the repository form so the entry survives new tags:

```yaml
allowBuilds:
  symbiont-cms@git+https://github.com/guutz/symbiont-cms.git: true
```

Requires Node 22.17 or later.

## Quick start

The examples use SvelteKit 3, where `$lib` is replaced by a subpath import
declared in `package.json` (imports need their file extension):

```json
"imports": {
  "#lib/*": "./src/lib/*"
}
```

On SvelteKit 2, write `$lib/symbiont` instead of `#lib/symbiont.ts`.

Create a query client once in your app. It is imported by browser code too,
so give it values that exist there: the Supabase URL and publishable key are
public by design and can simply be written in.

```ts
// src/lib/symbiont.ts
import { createSymbiontClient } from 'symbiont-cms';

export const symbiont = createSymbiontClient({
  supabase: {
    url: 'https://your-project.supabase.co',
    publishableKey: 'sb_publishable_...'
  },
  databases: [
    {
      alias: 'blog',
      dataSourceId: 'your-notion-data-source-id'
    }
  ]
});
```

Use it in server load functions.

```ts
// src/routes/[slug]/+page.server.ts
import { symbiont } from '#lib/symbiont.ts';

export const load = async ({ params, fetch }) => {
  const post = await symbiont.getPageBySlug(params.slug, { fetch, alias: 'blog' });
  return { post };
};
```

Use sync handlers in API routes.

```ts
// src/routes/api/sync/+server.ts
import { handlePollBlogRequest } from 'symbiont-cms/server';
import { symbiontSync } from '#lib/symbiont.server.ts';

export const GET = (event) => handlePollBlogRequest(symbiontSync, event);
```

Give symbiont the app's secrets. The server reads `NOTION_TOKEN`,
`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` and `NOTION_WEBHOOK_SECRET` with
`process.env` as a fallback, but Vite's dev server does not put `.env` there,
so hand it SvelteKit's env once at startup. On SvelteKit 3, declare the
variables in `src/env.ts`:

```ts
// src/env.ts
import { defineEnvVars } from '@sveltejs/kit/env';

// Kit validates declared variables at startup, and one without a schema is
// required: a single missing secret would take the whole site down. Optional
// keeps symbiont's behaviour, where it only breaks the endpoint that needs it.
const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
  NOTION_TOKEN: { schema: optional },
  SUPABASE_SERVICE_ROLE_KEY: { schema: optional },
  CRON_SECRET: { schema: optional },
  NOTION_WEBHOOK_SECRET: { schema: optional }
});
```

```ts
// src/hooks.server.ts
import * as env from '$app/env/private';
import { setEnvSource } from 'symbiont-cms/server';

setEnvSource(env);
```

On SvelteKit 2: `import { env } from '$env/dynamic/private'` and
`setEnvSource(env)`.

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
    url: 'https://your-project.supabase.co',
    publishableKey: 'sb_publishable_...'
  },
  databases: [
    {
      alias: 'blog',
      dataSourceId: 'your-notion-data-source-id'
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
    url: 'https://your-project.supabase.co',
    publishableKey: 'sb_publishable_...'
  },

  databases: [
    {
      alias: 'blog',
      dataSourceId: 'your-notion-data-source-id'
    }
  ],

  // Server-side rendering options for renderMarkdownToHtml. Footnotes,
  // ==highlights==, ||spoilers||, KaTeX math ($$...$$), abbreviations,
  // attributes and figures are always on.
  markdown: {
    toc: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4
    },
    extensions: {
      textColors: true // {red}(text)
    },
    images: {
      lazy: true
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

    // Writing back to Notion during a sync (slug, cover, custom property
    // hooks; `content` writes processed markdown back into the page body)
    syncBackToNotion: { content: false, properties: true },
    syncStrategy: 'patch', // or 'replace': how content write-back edits blocks
    forceFullReplaceThreshold: 0.6, // patch falls back to replace above this

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

- `symbiont-cms`: client APIs and types. Safe to import in browser code.
- `symbiont-cms/server`: sync handlers and server-only utilities.

Neither imports anything from SvelteKit, so both also load in plain Node
(scripts, tests).

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
- Use `on('content:sync', fn, { name })` (event names are type-checked) for hook sugar when writing custom hooks

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
