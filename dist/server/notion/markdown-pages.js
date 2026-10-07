import { withNotionRetry } from './retry.js';
/** Notion's markdown parser is synchronous below this many characters. */
const ASYNC_THRESHOLD = 400_000;
/** How long to wait for an async import before giving up, in poll attempts. */
const MAX_POLLS = 60;
async function awaitAsyncTask(notion, taskId) {
    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        const task = (await withNotionRetry(() => notion.asyncTasks.retrieve({ task_id: taskId })));
        if (task.status === 'succeeded')
            return task.result ?? {};
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
export async function createPageFromMarkdown(notion, { dataSourceId, properties, markdown }) {
    const useAsync = markdown.length > ASYNC_THRESHOLD;
    const response = (await withNotionRetry(() => notion.pages.create({
        parent: { type: 'data_source_id', data_source_id: dataSourceId },
        properties,
        markdown,
        ...(useAsync ? { allow_async: true } : {})
    })));
    if (response.object === 'async_task' && response.id) {
        const result = await awaitAsyncTask(notion, response.id);
        const id = result.id ?? response.result?.id;
        if (!id) {
            throw new Error('Notion accepted the page asynchronously but did not return its ID. ' +
                'The page should exist; check the data source in Notion.');
        }
        const page = (await withNotionRetry(() => notion.pages.retrieve({ page_id: id })));
        return { id, page };
    }
    if (!response.id)
        throw new Error('Notion did not return a page ID.');
    return { id: response.id, page: response };
}
/**
 * Replace a page's entire body with markdown. Properties are untouched.
 */
export async function replacePageMarkdown(notion, pageId, markdown, { allowDeletingContent = false } = {}) {
    const response = (await withNotionRetry(() => notion.pages.updateMarkdown({
        page_id: pageId,
        type: 'replace_content',
        replace_content: {
            new_str: markdown,
            ...(allowDeletingContent ? { allow_deleting_content: true } : {})
        },
        ...(markdown.length > ASYNC_THRESHOLD ? { allow_async: true } : {})
    })));
    if (response.object === 'async_task' && response.id) {
        await awaitAsyncTask(notion, response.id);
    }
}
//# sourceMappingURL=markdown-pages.js.map