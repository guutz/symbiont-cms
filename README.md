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

Create a client once in your app.

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

export const GET = (event) => handlePollBlogRequest(symbiont, event);
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

## Full sample config (all options)

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
      // Required
      alias: 'blog',
      dataSourceId: process.env.NOTION_DATABASE_ID!,

      // Hook pipeline
      hooks: [
        {
          name: 'custom:publish-check',
          event: 'publish:check',
          priority: 'before', // 'before' | 'after' | 'override' | 'fallback'
          continueOnError: false,
          fn: async (ctx) => {
            const status = ctx.page.properties?.Status?.status?.name;
            return status === 'Published';
          }
        }
      ],

      // Slug behavior
      slugProperty: 'Slug',
      onSlugConflict: 'auto-rename', // 'auto-rename' | 'error' | 'use-page-id'

      // Lifecycle
      onBeforeSync: async () => {
        // optional per-datasource setup
      },
      onAfterSync: async () => {
        // optional per-datasource cleanup
      },

      // Metadata mappings
      tagsProperty: 'Tags',
      authorsProperty: 'Authors',
      summaryProperty: 'Summary',
      coverProperty: 'Cover',

      // Content source behavior
      contentSourceRule: 'NOTION', // 'NOTION' | 'WEB_EDITOR' | (page) => ...

      // Notion write-back strategy
      syncStrategy: 'patch', // 'patch' | 'replace'
      forceFullReplaceThreshold: 0.6,

      // Write-back controls
      syncBackToNotion: {
        content: true,
        properties: true
      }
      // You can also use a boolean:
      // syncBackToNotion: true
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
```

## Exports

- `symbiont-cms`: client APIs, types, optional Svelte components
- `symbiont-cms/server`: sync handlers and server-only utilities

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
