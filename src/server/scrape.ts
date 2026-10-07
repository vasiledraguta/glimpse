import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type {
	HackerNewsConfig,
	NewScrapeResult,
	RedditConfig,
	Source,
} from '@/db';
import { db, scrapeResults, sources } from '@/db';
import { scrapeHackerNews } from '@/lib/scrapers/hackernews';
import { scrapeProductHunt } from '@/lib/scrapers/producthunt';
import { scrapeSubreddit } from '@/lib/scrapers/reddit';

type ScrapeSourceResult = {
	sourceId: string;
	sourceName: string;
	itemsFound: number;
	success: boolean;
	error?: string;
};

let activeScrape: AbortController | null = null;

function runScraper(
	source: Source,
	signal?: AbortSignal,
): Promise<Array<NewScrapeResult>> {
	switch (source.type) {
		case 'reddit':
			return scrapeSubreddit(
				source.id,
				(source.config as RedditConfig).subreddit,
				signal,
			);
		case 'hackernews':
			return scrapeHackerNews(
				source.id,
				source.config as HackerNewsConfig,
				signal,
			);
		case 'producthunt':
			return scrapeProductHunt(source.id);
	}
}

async function saveResults(
	source: Source,
	items: Array<NewScrapeResult>,
): Promise<void> {
	if (items.length > 0) {
		const inserted = await db
			.insert(scrapeResults)
			.values(items)
			.onConflictDoNothing({
				target: [scrapeResults.sourceId, scrapeResults.externalId],
			})
			.returning({ id: scrapeResults.id });
		console.log(
			`[scrape] Inserted ${inserted.length}/${items.length} items for ${source.name}`,
		);
	}

	await db
		.update(sources)
		.set({ lastScrapedAt: new Date(), updatedAt: new Date() })
		.where(eq(sources.id, source.id));
}

function abortedResult(source: Source): ScrapeSourceResult {
	return {
		sourceId: source.id,
		sourceName: source.name,
		itemsFound: 0,
		success: false,
		error: 'Aborted by user',
	};
}

export const getScrapeStatus = createServerFn({ method: 'GET' }).handler(
	() => ({ isActive: activeScrape !== null }),
);

export const stopScraping = createServerFn({ method: 'POST' }).handler(() => {
	console.log('[scrape] Stop requested');
	activeScrape?.abort();
	return { stopped: true };
});

export const scrapeSource = createServerFn({ method: 'POST' })
	.validator(z.object({ sourceId: z.uuid() }))
	.handler(async ({ data }) => {
		const [source] = await db
			.select()
			.from(sources)
			.where(eq(sources.id, data.sourceId))
			.limit(1);

		if (!source) {
			throw new Error('Source not found');
		}

		const items = await runScraper(source);
		await saveResults(source, items);

		return {
			sourceId: source.id,
			sourceName: source.name,
			itemsFound: items.length,
		};
	});

export const scrapeAllSources = createServerFn({ method: 'POST' }).handler(
	async () => {
		const controller = new AbortController();
		const { signal } = controller;
		const isAborted = () => signal.aborted;
		activeScrape = controller;

		console.log('[scrape] Starting scrape of all sources');

		try {
			const enabledSources = await db
				.select()
				.from(sources)
				.where(eq(sources.enabled, true));

			const results: Array<ScrapeSourceResult> = [];

			for (const source of enabledSources) {
				if (isAborted()) {
					results.push(abortedResult(source));
					continue;
				}

				try {
					const items = await runScraper(source, signal);
					signal.throwIfAborted();

					await saveResults(source, items);
					results.push({
						sourceId: source.id,
						sourceName: source.name,
						itemsFound: items.length,
						success: true,
					});
				} catch (error) {
					if (isAborted()) {
						console.log('[scrape] Aborted, discarding results');
						results.push(abortedResult(source));
						continue;
					}
					console.error(`[scrape] Failed to scrape ${source.name}:`, error);
					results.push({
						sourceId: source.id,
						sourceName: source.name,
						itemsFound: 0,
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			}

			console.log('[scrape] Scraping completed');
			return results;
		} finally {
			if (activeScrape === controller) {
				activeScrape = null;
			}
		}
	},
);
