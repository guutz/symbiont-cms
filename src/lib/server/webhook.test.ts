import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const retrieve = vi.fn();
const processPage = vi.fn();
const createCoordinator = vi.fn((..._args: any[]) => ({ processPage }));

vi.mock('@notionhq/client', () => ({
	// A class, because the code under test calls `new Client(...)`.
	Client: class {
		pages = { retrieve };
	},
}));
vi.mock('./sync/coordinator.js', () => ({
	createNotionToDatabaseSyncCoordinator: (...args: any[]) => createCoordinator(...args),
}));

const { syncPage } = await import('./webhook.js');
const { setEnvSource } = await import('./utils/env.js');

const client = {
	config: {
		databases: [
			{ alias: 'articles', dataSourceId: 'ds-articles' },
			{ alias: 'pages', dataSourceId: 'ds-pages' },
		],
	},
} as any;

describe('syncPage', () => {
	beforeEach(() => {
		setEnvSource({ NOTION_TOKEN: 'test-token' });
		retrieve.mockReset();
		processPage.mockReset().mockResolvedValue(true);
		createCoordinator.mockClear();
	});
	afterEach(() => setEnvSource(null));

	it('fetches the page and runs it through the normal pipeline, trusting the caller', async () => {
		const page = { id: 'p1', parent: { type: 'data_source_id', data_source_id: 'ds-articles' } };
		retrieve.mockResolvedValue(page);

		await expect(syncPage(client, 'articles', 'p1')).resolves.toBe(true);

		expect(retrieve).toHaveBeenCalledWith({ page_id: 'p1' });
		expect(createCoordinator.mock.calls[0][1]).toMatchObject({ alias: 'articles', dataSourceId: 'ds-articles' });
		expect(processPage).toHaveBeenCalledWith(page, undefined, { trustEvent: true });
	});

	it('accepts the dataSourceId as well as the alias', async () => {
		retrieve.mockResolvedValue({ id: 'p1', parent: { data_source_id: 'ds-articles' } });
		await syncPage(client, 'ds-articles', 'p1');
		expect(createCoordinator.mock.calls[0][1]).toMatchObject({ alias: 'articles' });
	});

	it('refuses a page from another data source rather than filing it under the wrong alias', async () => {
		retrieve.mockResolvedValue({ id: 'p1', parent: { data_source_id: 'ds-pages' } });
		await expect(syncPage(client, 'articles', 'p1')).rejects.toThrow(/belongs to data source ds-pages/);
		expect(processPage).not.toHaveBeenCalled();
	});

	it('refuses an unconfigured database before touching Notion', async () => {
		await expect(syncPage(client, 'nope', 'p1')).rejects.toThrow(/not configured/);
		expect(retrieve).not.toHaveBeenCalled();
	});
});
