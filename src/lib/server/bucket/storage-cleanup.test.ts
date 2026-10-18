import { describe, expect, it } from 'vitest';
import { cleanupUnusedMedia, extractReferencedPaths } from './storage-cleanup.js';

const URL_BASE = 'https://x.supabase.co/storage/v1/object/public/media';

/** A media bucket and pages table, just enough for cleanupUnusedMedia. */
function fakeSupabase(files: string[], pages: Array<Record<string, unknown>>) {
	const removed: string[] = [];
	const list = async (prefix: string, opts: { offset: number }) => {
		if (opts.offset > 0) return { data: [], error: null };
		const seen = new Map<string, { name: string; id: string | null }>();
		for (const f of files) {
			const rest = prefix ? (f.startsWith(`${prefix}/`) ? f.slice(prefix.length + 1) : null) : f;
			if (rest === null) continue;
			const [head, ...tail] = rest.split('/');
			seen.set(head, { name: head, id: tail.length ? null : `id-${head}` });
		}
		return { data: [...seen.values()], error: null };
	};
	const client = {
		storage: {
			from: () => ({
				list,
				remove: async (paths: string[]) => {
					removed.push(...paths);
					return { error: null };
				},
			}),
		},
		from: () => ({
			select: () => ({ range: async (from: number) => ({ data: from === 0 ? pages : [], error: null }) }),
		}),
	};
	return { client: client as any, removed };
}

describe('cleanupUnusedMedia', () => {
	const files = [
		'in-content.webp',
		'in-cover.webp',
		'in-summary.webp',
		'in-meta.png',
		'My Photo.jpg',
		'orphan.png',
		'issues/2026-10-06.pdf',
		'submissions/2026-10/draft.webp',
		'legacy/img/a.webp',
	];
	const pages = [
		{
			content: `![x](${URL_BASE}/in-content.webp) ![y](${URL_BASE}/My%20Photo.jpg)`,
			cover: `${URL_BASE}/in-cover.webp`,
			summary: `![s](${URL_BASE}/in-summary.webp)`,
			meta: { cover: `${URL_BASE}/in-meta.png`, layout: 'lead' },
		},
	];

	it('keeps anything referenced from content, cover, summary or meta, encoded or not', async () => {
		const { client, removed } = fakeSupabase(files, pages);
		const result = await cleanupUnusedMedia(client, { excludePrefixes: ['submissions/', 'legacy/'] });
		expect(removed).toEqual(['orphan.png']);
		expect(result.deleted).toBe(1);
	});

	it('never touches issues/ or the excluded prefixes, even when unreferenced', async () => {
		const { client, removed } = fakeSupabase(files, []);
		await cleanupUnusedMedia(client, { excludePrefixes: ['submissions/', 'legacy/'] });
		expect(removed).not.toContain('issues/2026-10-06.pdf');
		expect(removed).not.toContain('submissions/2026-10/draft.webp');
		expect(removed).not.toContain('legacy/img/a.webp');
	});

	it('a dry run reports without deleting', async () => {
		const { client, removed } = fakeSupabase(files, pages);
		const result = await cleanupUnusedMedia(client, { dryRun: true, excludePrefixes: ['submissions/', 'legacy/'] });
		expect(removed).toEqual([]);
		expect(result.deletedPaths).toEqual(['orphan.png']);
	});
});

describe('extractReferencedPaths', () => {
	it('stops at the end of a markdown link, an HTML attribute or a JSON string', () => {
		const out = new Set<string>();
		extractReferencedPaths(
			`[a](${URL_BASE}/one.png) <img src="${URL_BASE}/two.png"> {"c":"${URL_BASE}/three.png"} <${URL_BASE}/four.png>`,
			out
		);
		expect([...out].sort()).toEqual(['four.png', 'one.png', 'three.png', 'two.png']);
	});
});
