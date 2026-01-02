import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { HackerNewsConfig, NewScrapeResult, RedditConfig } from '@/db';
import { db, scrapeResults, sources } from '@/db';
import {
	scrapeHackerNews,
	setHackerNewsAborted,
} from '@/lib/scrapers/hackernews';
import { scrapeProductHunt } from '@/lib/scrapers/producthunt';
import { scrapeSubreddit } from '@/lib/scrapers/reddit';

let isScrapingActive = false;
let shouldAbort = false;

export const getScrapeStatus = createServerFn({ method: 'GET' }).handler(() => {
	return {
		isActive: isScrapingActive,
	};
});

export const stopScraping = createServerFn({ method: 'POST' }).handler(() => {
	console.log('[scrape] Stop requested');
	shouldAbort = true;
	setHackerNewsAborted(true);
	return { stopped: true };
});

export const scrapeSource = createServerFn({ method: 'POST' })
	.inputValidator((data: { sourceId: string }) =>
		z.object({ sourceId: z.string().uuid() }).parse(data),
	)
	.handler(async ({ data }) => {
		const sourceResult = await db
			.select()
			.from(sources)
			.where(eq(sources.id, data.sourceId))
			.limit(1);

		const source = sourceResult.at(0);
		if (!source) {
			throw new Error('Source not found');
		}

		let results: Array<NewScrapeResult> = [];

		switch (source.type) {
			case 'reddit': {
				const config = source.config as RedditConfig;
				results = await scrapeSubreddit(source.id, config.subreddit);
				break;
			}
			case 'hackernews': {
				const config = source.config as HackerNewsConfig;
				results = await scrapeHackerNews(source.id, config);
				break;
			}
			case 'producthunt': {
				results = await scrapeProductHunt(source.id);
				break;
			}
		}

		if (results.length > 0) {
			await db
				.insert(scrapeResults)
				.values(results)
				.onConflictDoNothing({
					target: [scrapeResults.sourceId, scrapeResults.externalId],
				});
		}

		await db
			.update(sources)
			.set({ lastScrapedAt: new Date(), updatedAt: new Date() })
			.where(eq(sources.id, source.id));

		return {
			sourceId: source.id,
			sourceName: source.name,
			itemsFound: results.length,
		};
	});

export const scrapeAllSources = createServerFn({ method: 'POST' }).handler(
	async () => {
		shouldAbort = false;
		setHackerNewsAborted(false);
		isScrapingActive = true;

		console.log('[scrape] Starting scrape of all sources');

		const enabledSources = await db
			.select()
			.from(sources)
			.where(eq(sources.enabled, true));

		const results = [];

		for (const source of enabledSources) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- shouldAbort is mutated externally by stopScraping
			if (shouldAbort) {
				console.log('[scrape] Aborted by user');
				results.push({
					sourceId: source.id,
					sourceName: source.name,
					itemsFound: 0,
					success: false,
					error: 'Aborted by user',
				});
				continue;
			}

			try {
				let scrapedItems: Array<NewScrapeResult> = [];

				switch (source.type) {
					case 'reddit': {
						const config = source.config as RedditConfig;
						scrapedItems = await scrapeSubreddit(source.id, config.subreddit);
						break;
					}
					case 'hackernews': {
						const config = source.config as HackerNewsConfig;
						scrapedItems = await scrapeHackerNews(source.id, config);
						break;
					}
					case 'producthunt': {
						scrapedItems = await scrapeProductHunt(source.id);
						break;
					}
				}

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- shouldAbort is mutated externally by stopScraping
				if (shouldAbort) {
					console.log('[scrape] Aborted after scraping, not saving results');
					results.push({
						sourceId: source.id,
						sourceName: source.name,
						itemsFound: 0,
						success: false,
						error: 'Aborted by user',
					});
					continue;
				}

				if (scrapedItems.length > 0) {
					console.log(
						`[scrape] Inserting ${scrapedItems.length} items for source ${source.name}`,
					);
					try {
						const inserted = await db
							.insert(scrapeResults)
							.values(scrapedItems)
							.onConflictDoNothing({
								target: [scrapeResults.sourceId, scrapeResults.externalId],
							})
							.returning({ id: scrapeResults.id });
						console.log(
							`[scrape] Successfully inserted ${inserted.length} items`,
						);
					} catch (error) {
						console.error('[scrape] Error inserting scrape results:', error);
						throw error;
					}
				} else {
					console.log(`[scrape] No items to insert for source ${source.name}`);
				}

				await db
					.update(sources)
					.set({ lastScrapedAt: new Date(), updatedAt: new Date() })
					.where(eq(sources.id, source.id));

				results.push({
					sourceId: source.id,
					sourceName: source.name,
					itemsFound: scrapedItems.length,
					success: true,
				});
			} catch (error) {
				results.push({
					sourceId: source.id,
					sourceName: source.name,
					itemsFound: 0,
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}

		isScrapingActive = false;
		console.log('[scrape] Scraping completed');
		return results;
	},
);
