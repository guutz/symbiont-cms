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
import { withNotionRetry } from './retry.js';

/** Notion's markdown parser is synchronous below this many characters. */
const ASYNC_THRESHOLD = 400_000;

/** How long to wait for an async import before giving up, in poll attempts. */
const MAX_POLLS = 60;

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

async function awaitAsyncTask(notion: Client, taskId: string): Promise<{ id?: string }> {
	for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
		const task = (await withNotionRetry(() => notion.asyncTasks.retrieve({ task_id: taskId }))) as {
			status?: string;
			poll_after_seconds?: number;
			error?: { message?: string };
			result?: { id?: string };
		};
		if (task.status === 'succeeded') return task.result ?? {};
		if (task.status === 'failed') {
			throw new Error(`Notion markdown import failed: ${task.error?.message ?? 'unknown error'}`);
		}
		await new Promise((resolve) => setTimeout(resolve, (task.poll_after_seconds ?? 2) * 1000));
	}
	throw new Error('Notion markdown import is still running after two minutes; check the page in Notion.');
}

/**
 * Create a page in a data source, with its body written from markdown.
 */
export async function createPageFromMarkdown(
	notion: Client,
	{ dataSourceId, properties, markdown }: CreatePageFromMarkdownOptions
): Promise<CreatedNotionPage> {
	const useAsync = markdown.length > ASYNC_THRESHOLD;

	const response = (await withNotionRetry(() =>
		notion.pages.create({
			parent: { type: 'data_source_id', data_source_id: dataSourceId },
			properties,
			markdown,
			...(useAsync ? { allow_async: true } : {})
		} as CreatePageArgs)
	)) as unknown as { object?: string; id?: string; result?: { id?: string } };

	if (response.object === 'async_task' && response.id) {
		const result = await awaitAsyncTask(notion, response.id);
		const id = result.id ?? response.result?.id;
		if (!id) {
			throw new Error(
				'Notion accepted the page asynchronously but did not return its ID. ' +
					'The page should exist; check the data source in Notion.'
			);
		}
		const page = (await withNotionRetry(() => notion.pages.retrieve({ page_id: id }))) as PageObjectResponse;
		return { id, page };
	}

	if (!response.id) throw new Error('Notion did not return a page ID.');
	return { id: response.id, page: response as unknown as PageObjectResponse };
}

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
export async function replacePageMarkdown(
	notion: Client,
	pageId: string,
	markdown: string,
	{ allowDeletingContent = false }: ReplacePageMarkdownOptions = {}
): Promise<void> {
	const response = (await withNotionRetry(() =>
		notion.pages.updateMarkdown({
			page_id: pageId,
			type: 'replace_content',
			replace_content: {
				new_str: markdown,
				...(allowDeletingContent ? { allow_deleting_content: true } : {})
			},
			...(markdown.length > ASYNC_THRESHOLD ? { allow_async: true } : {})
		} as Parameters<Client['pages']['updateMarkdown']>[0])
	)) as { object?: string; id?: string };

	if (response.object === 'async_task' && response.id) {
		await awaitAsyncTask(notion, response.id);
	}
}
