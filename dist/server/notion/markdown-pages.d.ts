/**
 * Write whole page bodies to Notion as markdown, through Notion's own parser.
 *
 * `pages.create` and `pages.updateMarkdown` take a `markdown` body and run
 * Notion's markdown dialect over it, which handles toggles, callouts, columns,
 * equations and tables that a hand-rolled markdown-to-blocks pass drops. Above
 * a size threshold Notion processes it asynchronously and hands back a task to
 * poll. These helpers hide that difference and the rate-limit retry.
 *
 * Standalone functions over a plain `@notionhq/client` Client rather than
 * NotionClient methods, on purpose. NotionClient gates content writes on the
 * sync's write policy (`syncBackToNotion.content`), which means "write
 * processed content back during a sync". A deliberate write -- creating a page
 * from a form, or handing a web-edited body back to Notion -- is not a sync
 * write-back, and an app that has turned sync-back off still needs to make it.
 * The caller owns the client and decides.
 */
import type { Client, PageObjectResponse } from '@notionhq/client';
type CreatePageArgs = Parameters<Client['pages']['create']>[0];
export interface CreatePageFromMarkdownOptions {
    /** The data source (database) the page goes into. */
    dataSourceId: string;
    /** Notion property values, in Notion's request shapes. */
    properties: NonNullable<CreatePageArgs['properties']>;
    /** The page body. */
    markdown: string;
}
export interface CreatedNotionPage {
    id: string;
    /**
     * The page as Notion returns it: properties (including any unique_id the
     * database assigned), url, timestamps. Re-fetched after an async import,
     * which returns only a task.
     */
    page: PageObjectResponse;
}
/**
 * Create a page in a data source, with its body written from markdown.
 */
export declare function createPageFromMarkdown(notion: Client, { dataSourceId, properties, markdown }: CreatePageFromMarkdownOptions): Promise<CreatedNotionPage>;
export interface ReplacePageMarkdownOptions {
    /**
     * Notion refuses to replace a body that contains child pages or databases,
     * because replacing would delete them. That guard is on by default; pass
     * true only when deleting them is intended.
     */
    allowDeletingContent?: boolean;
}
/**
 * Replace a page's entire body with markdown. Properties are untouched.
 */
export declare function replacePageMarkdown(notion: Client, pageId: string, markdown: string, { allowDeletingContent }?: ReplacePageMarkdownOptions): Promise<void>;
export {};
//# sourceMappingURL=markdown-pages.d.ts.map