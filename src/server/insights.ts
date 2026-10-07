import { createServerFn } from '@tanstack/react-start';
import { and, count, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import {
	db,
	firstOrThrow,
	insights,
	processingBatches,
	scrapeResults,
	sources,
} from '@/db';
import { extractInsights } from '@/lib/ai';
import { AI_CONFIG } from '@/lib/constants';
import { INSIGHT_CATEGORIES, OPPORTUNITY_TYPES } from '@/lib/domain';
import {
	deleteLowQualityItems,
	preFilterScrapeResults,
} from '@/lib/pre-filter';

const getInsightsSchema = z.object({
	limit: z.number().int().min(1).max(100).default(20),
	offset: z.number().int().min(0).default(0),
	category: z.enum(INSIGHT_CATEGORIES).optional(),
	opportunityType: z.enum(OPPORTUNITY_TYPES).optional(),
	minConfidence: z.number().min(0).max(1).default(0),
});

const idSchema = z.object({ id: z.uuid() });

const insightWithSource = {
	insight: insights,
	scrapeResult: scrapeResults,
	source: sources,
};

export const getInsights = createServerFn({ method: 'GET' })
	.validator(getInsightsSchema)
	.handler(async ({ data }) => {
		const conditions = [];

		if (data.category) {
			conditions.push(eq(insights.category, data.category));
		}

		if (data.opportunityType) {
			conditions.push(eq(insights.opportunityType, data.opportunityType));
		}

		if (data.minConfidence > 0) {
			conditions.push(gte(insights.confidence, data.minConfidence));
		}

		return db
			.select(insightWithSource)
			.from(insights)
			.innerJoin(scrapeResults, eq(insights.scrapeResultId, scrapeResults.id))
			.innerJoin(sources, eq(scrapeResults.sourceId, sources.id))
			.where(and(...conditions))
			.orderBy(desc(insights.createdAt))
			.limit(data.limit)
			.offset(data.offset);
	});

export const getInsight = createServerFn({ method: 'GET' })
	.validator(idSchema)
	.handler(async ({ data }) => {
		const [result] = await db
			.select(insightWithSource)
			.from(insights)
			.innerJoin(scrapeResults, eq(insights.scrapeResultId, scrapeResults.id))
			.innerJoin(sources, eq(scrapeResults.sourceId, sources.id))
			.where(eq(insights.id, data.id))
			.limit(1);

		return result ?? null;
	});

export const processWithAI = createServerFn({ method: 'POST' }).handler(
	async () => {
		console.log('[ai] Starting AI processing with pre-filter...');

		const { toProcess, toDeleteIds } = await preFilterScrapeResults(
			AI_CONFIG.batchSize,
		);

		if (toDeleteIds.length > 0) {
			const deleted = await deleteLowQualityItems(toDeleteIds);
			console.log(`[ai] Deleted ${deleted} low-quality items from pre-filter`);
		}

		if (toProcess.length === 0) {
			console.log('[ai] No items passed pre-filter');
			return {
				processed: 0,
				deleted: toDeleteIds.length,
				message: 'No quality items to process',
			};
		}

		const batch = await db
			.insert(processingBatches)
			.values({
				status: 'processing',
				totalItems: toProcess.length,
				processedItems: 0,
				startedAt: new Date(),
			})
			.returning()
			.then(firstOrThrow);

		console.log(`[ai] Created batch: ${batch.id}`);

		try {
			const itemsForAI = toProcess.map((result) => ({
				externalId: result.scrapeResult.id,
				title: result.scrapeResult.title,
				content: result.scrapeResult.content,
				source: result.scrapeResult.sourceType,
			}));

			const aiResults = await extractInsights(itemsForAI);

			const highConfidence = aiResults.insights.filter(
				(i) => i.confidence >= AI_CONFIG.minConfidence,
			);
			const lowConfidence = aiResults.insights.filter(
				(i) => i.confidence < AI_CONFIG.minConfidence,
			);

			console.log(
				`[ai] ${highConfidence.length} high-confidence, ${lowConfidence.length} low-confidence`,
			);

			if (highConfidence.length > 0) {
				const newInsights = highConfidence.map(({ externalId, ...rest }) => ({
					scrapeResultId: externalId,
					...rest,
				}));

				await db.insert(insights).values(newInsights);
				console.log(`[ai] Inserted ${newInsights.length} insights`);
			}

			if (lowConfidence.length > 0) {
				const idsToDelete = lowConfidence.map((i) => i.externalId);
				await db
					.delete(scrapeResults)
					.where(inArray(scrapeResults.id, idsToDelete));
				console.log(
					`[ai] Deleted ${lowConfidence.length} low-confidence AI results`,
				);
			}

			await db
				.update(processingBatches)
				.set({
					status: 'completed',
					processedItems: highConfidence.length,
					completedAt: new Date(),
				})
				.where(eq(processingBatches.id, batch.id));

			return {
				processed: highConfidence.length,
				deleted: toDeleteIds.length + lowConfidence.length,
				total: toProcess.length,
				batchId: batch.id,
			};
		} catch (error) {
			console.error('[ai] Processing failed:', error);

			await db
				.update(processingBatches)
				.set({ status: 'failed', completedAt: new Date() })
				.where(eq(processingBatches.id, batch.id));

			throw error;
		}
	},
);

export const getInsightsCount = createServerFn({ method: 'GET' }).handler(
	async () => {
		const result = await db
			.select({ count: count() })
			.from(insights)
			.then(firstOrThrow);

		return result.count;
	},
);

export const deleteInsight = createServerFn({ method: 'POST' })
	.validator(idSchema)
	.handler(async ({ data }) => {
		await db
			.delete(scrapeResults)
			.where(
				inArray(
					scrapeResults.id,
					db
						.select({ id: insights.scrapeResultId })
						.from(insights)
						.where(eq(insights.id, data.id)),
				),
			);

		return { success: true };
	});

export const getProcessingStatus = createServerFn({ method: 'GET' }).handler(
	async () => {
		const [latestBatch] = await db
			.select()
			.from(processingBatches)
			.orderBy(desc(processingBatches.createdAt))
			.limit(1);

		const { unprocessedCount } = await db
			.select({ unprocessedCount: count() })
			.from(scrapeResults)
			.leftJoin(insights, eq(scrapeResults.id, insights.scrapeResultId))
			.where(isNull(insights.id))
			.then(firstOrThrow);

		return {
			latestBatch: latestBatch ?? null,
			unprocessedCount,
		};
	},
);
