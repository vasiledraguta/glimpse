import {
	PAIN_POINT_KEYWORD_CATEGORIES,
	RATE_LIMITS,
	SCRAPE_CONFIG,
} from '../constants';
import type { NewScrapeResult } from '@/db';

let aborted = false;

export function setHackerNewsAborted(value: boolean): void {
	aborted = value;
}

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

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(html: string): string {
	return html
		.replace(/<[^>]*>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.replace(/&#x2F;/g, '/')
		.replace(/&nbsp;/g, ' ')
		.trim();
}

async function searchAlgoliaKeyword(
	keyword: string,
	maxResults: number,
	maxAgeHours: number,
): Promise<Array<AlgoliaHit>> {
	const minTimestamp = Math.floor(Date.now() / 1000) - maxAgeHours * 3600;

	const url = new URL(`${ALGOLIA_API_BASE}/search_by_date`);
	url.searchParams.set('query', keyword);
	url.searchParams.set('tags', '(story,comment)');
	url.searchParams.set('numericFilters', `created_at_i>${minTimestamp}`);
	url.searchParams.set('hitsPerPage', String(maxResults));

	const response = await fetch(url.toString());

	if (!response.ok) {
		console.error(`[HN] Algolia error for "${keyword}": ${response.status}`);
		return [];
	}

	const data: AlgoliaResponse = await response.json();
	return data.hits;
}

async function searchCategory(
	categoryName: string,
	keywords: Array<string>,
	maxResultsPerKeyword: number,
	maxAgeHours: number,
): Promise<Array<AlgoliaHit>> {
	console.log(
		`[HN] Searching category: ${categoryName} (${keywords.length} keywords in parallel)...`,
	);

	const results = await Promise.all(
		keywords.map((keyword) =>
			searchAlgoliaKeyword(keyword, maxResultsPerKeyword, maxAgeHours),
		),
	);

	const allHits = results.flat();
	console.log(`[HN] Found ${allHits.length} results for ${categoryName}`);

	return allHits;
}

interface HackerNewsConfig {
	includeAskHN: boolean;
	includeShowHN: boolean;
}

export async function scrapeHackerNews(
	sourceId: string,
	_config: HackerNewsConfig,
): Promise<Array<NewScrapeResult>> {
	const startTime = Date.now();
	console.log('[HN] Starting Algolia-based scrape...');

	const allHits = new Map<string, AlgoliaHit>();
	const categories = Object.entries(PAIN_POINT_KEYWORD_CATEGORIES);

	for (const [categoryName, keywords] of categories) {
		if (aborted) {
			console.log('[HN] Scraping aborted');
			break;
		}

		try {
			const maxPerKeyword = Math.ceil(
				RATE_LIMITS.hackerNews.maxResultsPerCategory / keywords.length,
			);

			const hits = await searchCategory(
				categoryName,
				keywords,
				Math.max(maxPerKeyword, 5),
				SCRAPE_CONFIG.maxPostAgeHours,
			);

			for (const hit of hits) {
				if (!allHits.has(hit.objectID)) {
					allHits.set(hit.objectID, hit);
				}
			}
		} catch (error) {
			console.error(`[HN] Error searching ${categoryName}:`, error);
		}

		await sleep(RATE_LIMITS.hackerNews.delayMs);
	}

	if (aborted) {
		console.log('[HN] Scraping was aborted, returning partial results');
	}

	console.log(`[HN] Total unique results: ${allHits.size}`);

	const results: Array<NewScrapeResult> = [];

	for (const hit of allHits.values()) {
		if (results.length >= RATE_LIMITS.hackerNews.maxTotalResults) {
			console.log(
				`[HN] Reached max results limit (${RATE_LIMITS.hackerNews.maxTotalResults})`,
			);
			break;
		}

		const isStory = hit._tags.includes('story');
		const content = isStory ? hit.title : hit.comment_text;

		if (!content) continue;

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
			},
			contentCreatedAt: new Date(hit.created_at),
		});
	}

	const elapsed = Date.now() - startTime;
	console.log(
		`[HN] Scraped ${results.length} items via Algolia in ${elapsed}ms`,
	);

	return results;
}
