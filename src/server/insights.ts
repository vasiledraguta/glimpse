import { createServerFn } from '@tanstack/react-start';
import { and, count, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db, insights, processingBatches, scrapeResults, sources } from '@/db';
import { extractInsights } from '@/lib/ai';
import { AI_CONFIG } from '@/lib/constants';
import {
	deleteLowQualityItems,
	preFilterScrapeResults,
} from '@/lib/pre-filter';

export const getInsights = createServerFn({ method: 'GET' })
	.inputValidator(
		(data: {
			limit?: number;
			offset?: number;
			category?: string;
			opportunityType?: string;
			minConfidence?: number;
		}) =>
			z
				.object({
					limit: z.number().min(1).max(100).default(20),
					offset: z.number().min(0).default(0),
					category: z
						.enum([
							'complaint',
							'feature_request',
							'pain_point',
							'idea',
							'other',
						])
						.optional(),
					opportunityType: z
						.enum(['gap', 'improvement', 'workflow', 'pricing', 'integration'])
						.optional(),
					minConfidence: z.number().min(0).max(1).default(0),
				})
				.parse(data),
	)
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

		const allInsights = await db
			.select({
				insight: insights,
				scrapeResult: scrapeResults,
				source: sources,
			})
			.from(insights)
			.innerJoin(scrapeResults, eq(insights.scrapeResultId, scrapeResults.id))
			.innerJoin(sources, eq(scrapeResults.sourceId, sources.id))
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(desc(insights.createdAt))
			.limit(data.limit)
			.offset(data.offset);

		return allInsights;
	});

export const getInsight = createServerFn({ method: 'GET' })
	.inputValidator((data: { id: string }) =>
		z.object({ id: z.string().uuid() }).parse(data),
	)
	.handler(async ({ data }) => {
		const [result] = await db
			.select({
				insight: insights,
				scrapeResult: scrapeResults,
				source: sources,
			})
			.from(insights)
			.innerJoin(scrapeResults, eq(insights.scrapeResultId, scrapeResults.id))
			.innerJoin(sources, eq(scrapeResults.sourceId, sources.id))
			.where(eq(insights.id, data.id))
			.limit(1);

		return result;
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

		const [batch] = await db
			.insert(processingBatches)
			.values({
				status: 'processing',
				totalItems: toProcess.length,
				processedItems: 0,
				startedAt: new Date(),
			})
			.returning();

		console.log(`[ai] Created batch: ${batch.id}`);

		try {
			const itemsForAI = toProcess.map((result) => ({
				externalId: result.scrapeResult.id,
				title: result.scrapeResult.title,
				content: result.scrapeResult.content,
				source: result.scrapeResult.sourceType,
			}));

			console.log(`[ai] Sending ${itemsForAI.length} items to Gemini...`);

			const aiResults = await extractInsights(itemsForAI);

			console.log(`[ai] Gemini returned ${aiResults.insights.length} insights`);

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
				const newInsights = highConfidence.map((aiInsight) => ({
					scrapeResultId: aiInsight.externalId,
					category: aiInsight.category,
					opportunityType: aiInsight.opportunityType,
					summary: aiInsight.summary,
					productIdea: aiInsight.productIdea,
					targetCustomer: aiInsight.targetCustomer,
					competitorsMentioned: aiInsight.competitorsMentioned,
					marketSignal: aiInsight.marketSignal,
					confidence: aiInsight.confidence,
					tags: aiInsight.tags,
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
		const [result] = await db.select({ count: count() }).from(insights);

		return result.count;
	},
);

export const deleteInsight = createServerFn({ method: 'POST' })
	.inputValidator((data: { id: string }) =>
		z.object({ id: z.string().uuid() }).parse(data),
	)
	.handler(async ({ data }) => {
		const insightResult = await db
			.select({ scrapeResultId: insights.scrapeResultId })
			.from(insights)
			.where(eq(insights.id, data.id));

		await db.delete(insights).where(eq(insights.id, data.id));

		if (insightResult.length > 0) {
			await db
				.delete(scrapeResults)
				.where(eq(scrapeResults.id, insightResult[0].scrapeResultId));
		}

		return { success: true };
	});

export const getProcessingStatus = createServerFn({ method: 'GET' }).handler(
	async () => {
		const [latestBatch] = await db
			.select()
			.from(processingBatches)
			.orderBy(desc(processingBatches.createdAt))
			.limit(1);

		const totalUnprocessed = await db
			.select()
			.from(scrapeResults)
			.leftJoin(insights, eq(scrapeResults.id, insights.scrapeResultId))
			.where(isNull(insights.id));

		return {
			latestBatch,
			unprocessedCount: totalUnprocessed.length,
		};
	},
);
