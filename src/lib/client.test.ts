import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { datasource_alias: string; slug: string; publish_at: string };

let rows: Row[] = [];

/**
 * In-memory stand-in for the PostgREST query builder. `like` follows SQL LIKE
 * semantics (`%` = any run, `_` = any one char) so a regression back to
 * pattern matching shows up here as wildcard hits; `eq` is exact.
 */
function likeToRegExp(pattern: string): RegExp {
	const source = pattern
		.split('')
		.map((ch) => (ch === '%' ? '.*' : ch === '_' ? '.' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
		.join('');
	return new RegExp(`^${source}$`, 's');
}

function query() {
	let result = [...rows];
	const builder = {
		select: () => builder,
		eq: (col: keyof Row, value: string) => {
			result = result.filter((r) => r[col] === value);
			return builder;
		},
		like: (col: keyof Row, pattern: string) => {
			const re = likeToRegExp(pattern);
			result = result.filter((r) => re.test(r[col]));
			return builder;
		},
		order: () => builder,
		range: (from: number, to: number) => Promise.resolve({ data: result.slice(from, to + 1), error: null }),
		maybeSingle: () =>
			Promise.resolve(
				result.length > 1
					? { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } }
					: { data: result[0] ?? null, error: null }
			),
	};
	return builder;
}

vi.mock('@supabase/supabase-js', () => ({
	createClient: () => ({ from: () => query() }),
}));

const { createSymbiontClient } = await import('./client.js');

const symbiont = createSymbiontClient({
	supabase: { url: 'http://localhost', publishableKey: 'anon' },
	databases: [{ alias: 'blog', dataSourceId: 'ds-blog' }],
} as any);

describe('createSymbiontClient lookups match exactly, not as LIKE patterns', () => {
	beforeEach(() => {
		rows = [
			{ datasource_alias: 'blog', slug: 'about', publish_at: '2026-01-01' },
			{ datasource_alias: 'blog', slug: 'contact', publish_at: '2026-01-02' },
			{ datasource_alias: 'blog', slug: '100%_done', publish_at: '2026-01-03' },
			{ datasource_alias: 'blogs', slug: 'about', publish_at: '2026-01-04' },
		];
	});

	it('treats % and _ in a slug literally', async () => {
		// Under LIKE, `%` matched every row and maybeSingle() threw.
		await expect(symbiont.getPageBySlug('%')).resolves.toBeNull();
		// Under LIKE, `abou_` matched `about`.
		await expect(symbiont.getPageBySlug('abou_')).resolves.toBeNull();
		await expect(symbiont.getPageBySlug('100_\\_done')).resolves.toBeNull();

		await expect(symbiont.getPageBySlug('100%_done')).resolves.toMatchObject({ slug: '100%_done' });
		await expect(symbiont.getPageBySlug('about')).resolves.toMatchObject({ slug: 'about', datasource_alias: 'blog' });
	});

	it('treats % and _ in an alias literally', async () => {
		await expect(symbiont.getAllPages({ alias: 'blog%' })).resolves.toEqual([]);
		await expect(symbiont.getPageBySlug('about', { alias: 'blog_' })).resolves.toBeNull();

		const blog = await symbiont.getAllPages({ alias: 'blog' });
		expect(blog.map((p) => p.slug).sort()).toEqual(['100%_done', 'about', 'contact']);
	});
});
