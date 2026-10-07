import {
	FEATURE_REQUEST_KEYWORDS,
	FRUSTRATION_KEYWORDS,
	HIGH_INTENT_KEYWORDS,
	PROBLEM_SEEKING_KEYWORDS,
	RATE_LIMITS,
	SCRAPE_CONFIG,
} from '../constants';
import {
	getKeywordTier,
	passesQualityFilter,
	sleep,
	stripHtml,
} from '../scraper-utils';
import type { KeywordTier } from '../scraper-utils';
import type { HackerNewsConfig } from '../domain';
import type { NewScrapeResult } from '@/db';

interface AlgoliaHit {
	objectID: string;
	author?: string;
	created_at: string;
	created_at_i: number;
	title?: string;
	url?: string;
	story_title?: string;
	story_url?: string;
	story_id?: number;
	comment_text?: string;
	points?: number;
	num_comments?: number;
	_tags: Array<string>;
}

interface AlgoliaResponse {
	hits: Array<AlgoliaHit>;
	nbHits: number;
	page: number;
	nbPages: number;
	hitsPerPage: number;
}

const ALGOLIA_API_BASE = 'https://hn.algolia.com/api/v1';

function getCompoundSearchQueries(): Array<{
	query: string;
	tier: KeywordTier;
	category: string;
}> {
	const queries: Array<{ query: string; tier: KeywordTier; category: string }> =
		[];

	for (const keyword of HIGH_INTENT_KEYWORDS.slice(0, 10)) {
		queries.push({ query: keyword, tier: 1, category: 'high_intent' });
	}

	for (const keyword of PROBLEM_SEEKING_KEYWORDS.slice(0, 15)) {
		queries.push({ query: keyword, tier: 2, category: 'problem_seeking' });
	}

	const contexts = ['software', 'app'];
	for (const keyword of FRUSTRATION_KEYWORDS.slice(0, 5)) {
		for (const context of contexts) {
			queries.push({
				query: `${keyword} ${context}`,
				tier: 3,
				category: 'frustration',
			});
		}
	}

	for (const keyword of FEATURE_REQUEST_KEYWORDS.slice(0, 8)) {
		queries.push({ query: keyword, tier: 4, category: 'feature_request' });
	}

	return queries;
}

async function searchAlgolia(
	query: string,
	maxResults: number,
	maxAgeHours: number,
): Promise<Array<AlgoliaHit>> {
	const minTimestamp = Math.floor(Date.now() / 1000) - maxAgeHours * 3600;
	const url = new URL(`${ALGOLIA_API_BASE}/search_by_date`);
	url.searchParams.set('query', query);
	url.searchParams.set('tags', '(story,comment)');
	url.searchParams.set('numericFilters', `created_at_i>${minTimestamp}`);
	url.searchParams.set('hitsPerPage', String(maxResults));

	const response = await fetch(url.toString());

	if (!response.ok) {
		console.error(`[HN] Algolia error for "${query}": ${response.status}`);
		return [];
	}

	const data: AlgoliaResponse = await response.json();
	return data.hits;
}

export async function scrapeHackerNews(
	sourceId: string,
	config: HackerNewsConfig,
	signal?: AbortSignal,
): Promise<Array<NewScrapeResult>> {
	const startTime = Date.now();
	console.log('[HN] Starting scrape...');

	const allHits = new Map<
		string,
		AlgoliaHit & { tier: KeywordTier; category: string }
	>();
	const queries = getCompoundSearchQueries();
	console.log(`[HN] Running ${queries.length} search queries...`);

	const batchSize = 5;
	for (let i = 0; i < queries.length; i += batchSize) {
		if (signal?.aborted) {
			console.log('[HN] Scraping aborted');
			break;
		}

		const batch = queries.slice(i, i + batchSize);
		const batchResults = await Promise.all(
			batch.map(async ({ query, tier, category }) => {
				const hits = await searchAlgolia(
					query,
					Math.ceil(
						RATE_LIMITS.hackerNews.maxResultsPerCategory / queries.length,
					),
					SCRAPE_CONFIG.maxPostAgeHours,
				);
				return { hits, tier, category };
			}),
		);

		for (const { hits, tier, category } of batchResults) {
			for (const hit of hits) {
				const existing = allHits.get(hit.objectID);
				if (existing && existing.tier <= tier) continue;

				const points = hit.points || 0;
				if (!passesQualityFilter(tier, points)) continue;

				allHits.set(hit.objectID, { ...hit, tier, category });
			}
		}

		if (i + batchSize < queries.length) {
			await sleep(RATE_LIMITS.hackerNews.delayMs * 2);
		}
	}

	console.log(`[HN] Total unique results: ${allHits.size}`);

	const results: Array<NewScrapeResult> = [];

	for (const hit of allHits.values()) {
		if (results.length >= RATE_LIMITS.hackerNews.maxTotalResults) break;

		const isStory = hit._tags.includes('story');
		const content = isStory ? hit.title : hit.comment_text;
		if (!content) continue;

		const tierInfo = getKeywordTier(content);
		if (!tierInfo) continue;

		if (isStory && hit.title) {
			const isAskHN = hit.title.toLowerCase().startsWith('ask hn');
			const isShowHN = hit.title.toLowerCase().startsWith('show hn');
			if (isAskHN && !config.includeAskHN) continue;
			if (isShowHN && !config.includeShowHN) continue;
		}

		results.push({
			sourceId,
			externalId: hit.objectID,
			type: isStory ? 'post' : 'comment',
			title: isStory ? (hit.title ?? null) : null,
			content: isStory
				? (hit.title ?? null)
				: stripHtml(hit.comment_text ?? ''),
			author: hit.author ?? null,
			url: isStory
				? (hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`)
				: `https://news.ycombinator.com/item?id=${hit.objectID}`,
			score: hit.points ?? 0,
			parentId: isStory ? null : (hit.story_id?.toString() ?? null),
			metadata: {
				storyTitle: hit.story_title ?? hit.title ?? null,
				numComments: hit.num_comments ?? 0,
				keywordTier: hit.tier,
				keywordCategory: hit.category,
			},
			contentCreatedAt: new Date(hit.created_at),
		});
	}

	const elapsed = Date.now() - startTime;
	console.log(`[HN] Scraped ${results.length} items in ${elapsed}ms`);
	return results;
}
