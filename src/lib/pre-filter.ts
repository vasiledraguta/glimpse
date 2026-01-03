import { desc, eq, inArray, isNull } from 'drizzle-orm';
import type { KeywordTier } from './scraper-utils';
import { db, insights, scrapeResults, sources } from '@/db';

export interface PreFilterResult {
	id: string;
	qualityScore: number;
	signals: {
		keywordTier: KeywordTier;
		engagement: 'high' | 'medium' | 'low';
		hasContext: boolean;
	};
	shouldProcess: boolean;
}

interface ScrapeResultWithMetadata {
	id: string;
	type: 'post' | 'comment';
	title: string | null;
	content: string | null;
	score: number;
	metadata: Record<string, unknown> | null;
	sourceType: string;
}

function getEngagementLevel(
	score: number,
	type: 'post' | 'comment',
): 'high' | 'medium' | 'low' {
	if (type === 'comment') {
		if (score >= 10) return 'high';
		if (score >= 3) return 'medium';
		return 'low';
	}
	if (score >= 50) return 'high';
	if (score >= 10) return 'medium';
	return 'low';
}

function calculateQualityScore(
	tier: KeywordTier,
	engagement: 'high' | 'medium' | 'low',
	hasContext: boolean,
	contentLength: number,
): number {
	let score = 0;

	const tierScores: Record<KeywordTier, number> = {
		1: 40,
		2: 30,
		3: 15,
		4: 20,
	};
	score += tierScores[tier];

	const engagementScores = { high: 30, medium: 20, low: 10 };
	score += engagementScores[engagement];

	if (hasContext) score += 15;

	if (contentLength > 200) score += 15;
	else if (contentLength > 100) score += 10;
	else if (contentLength > 50) score += 5;

	return Math.min(100, score);
}

export interface PreFilterOutput {
	toProcess: Array<
		PreFilterResult & { scrapeResult: ScrapeResultWithMetadata }
	>;
	toDeleteIds: Array<string>;
}

export async function preFilterScrapeResults(
	limit = 20,
): Promise<PreFilterOutput> {
	const unprocessed = await db
		.select({
			scrapeResult: scrapeResults,
			source: sources,
		})
		.from(scrapeResults)
		.leftJoin(insights, eq(scrapeResults.id, insights.scrapeResultId))
		.innerJoin(sources, eq(scrapeResults.sourceId, sources.id))
		.where(isNull(insights.id))
		.orderBy(desc(scrapeResults.score))
		.limit(limit * 3);

	const toProcess: PreFilterOutput['toProcess'] = [];
	const toDeleteIds: Array<string> = [];

	for (const { scrapeResult, source } of unprocessed) {
		if (!scrapeResult.content) {
			toDeleteIds.push(scrapeResult.id);
			continue;
		}

		const metadata = scrapeResult.metadata as Record<string, unknown> | null;
		const keywordTier = (metadata?.keywordTier as KeywordTier | undefined) ?? 3;
		const engagement = getEngagementLevel(
			scrapeResult.score ?? 0,
			scrapeResult.type,
		);
		const hasContext =
			scrapeResult.type === 'comment'
				? Boolean(metadata?.postTitle || metadata?.storyTitle)
				: Boolean(scrapeResult.title);

		const qualityScore = calculateQualityScore(
			keywordTier,
			engagement,
			hasContext,
			scrapeResult.content.length,
		);

		const shouldProcess = qualityScore >= 40;

		if (shouldProcess && toProcess.length < limit) {
			toProcess.push({
				id: scrapeResult.id,
				qualityScore,
				signals: { keywordTier, engagement, hasContext },
				shouldProcess,
				scrapeResult: {
					id: scrapeResult.id,
					type: scrapeResult.type,
					title: scrapeResult.title,
					content: scrapeResult.content,
					score: scrapeResult.score ?? 0,
					metadata,
					sourceType: source.type,
				},
			});
		} else if (!shouldProcess) {
			toDeleteIds.push(scrapeResult.id);
		}
	}

	console.log(
		`[pre-filter] ${toProcess.length} items pass, ${toDeleteIds.length} to delete`,
	);

	return { toProcess, toDeleteIds };
}

export async function deleteLowQualityItems(
	ids: Array<string>,
): Promise<number> {
	if (ids.length === 0) return 0;
	await db.delete(scrapeResults).where(inArray(scrapeResults.id, ids));
	return ids.length;
}
