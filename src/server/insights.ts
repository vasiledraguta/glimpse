import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, gte, inArray, isNotNull, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db, insights, processingBatches, scrapeResults, sources } from '@/db';
import { extractInsights } from '@/lib/ai';
import { AI_CONFIG } from '@/lib/constants';

export const getInsights = createServerFn({ method: 'GET' })
	.inputValidator(
		(data: {
			limit?: number;
			offset?: number;
			category?: string;
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
					minConfidence: z.number().min(0).max(1).default(0.5),
				})
				.parse(data),
	)
	.handler(async ({ data }) => {
		const conditions = [];

		conditions.push(gte(insights.confidence, data.minConfidence));

		if (data.category) {
			conditions.push(eq(insights.category, data.category));
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
			.where(and(...conditions))
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
		console.log('[ai] Starting AI processing...');

		const unprocessed = await db
			.select({
				scrapeResult: scrapeResults,
			})
			.from(scrapeResults)
			.leftJoin(insights, eq(scrapeResults.id, insights.scrapeResultId))
			.where(and(isNotNull(scrapeResults.content), isNull(insights.id)))
			.limit(AI_CONFIG.batchSize);

		const unprocessedResults = unprocessed.map((r) => r.scrapeResult);

		console.log(
			`[ai] Found ${unprocessedResults.length} unprocessed items with content`,
		);

		if (unprocessedResults.length === 0) {
			console.log('[ai] No unprocessed items found, exiting');
			return {
				processed: 0,
				deleted: 0,
				message: 'No unprocessed items found',
			};
		}

		const [batch] = await db
			.insert(processingBatches)
			.values({
				status: 'processing',
				totalItems: unprocessedResults.length,
				processedItems: 0,
				startedAt: new Date(),
			})
			.returning();

		console.log(`[ai] Created processing batch: ${batch.id}`);

		try {
			const sourceIds = [...new Set(unprocessedResults.map((r) => r.sourceId))];
			const sourcesData = await db
				.select()
				.from(sources)
				.where(inArray(sources.id, sourceIds));
			const sourceMap = new Map(sourcesData.map((s) => [s.id, s]));

			const itemsForAI = unprocessedResults.map((result) => {
				const source = sourceMap.get(result.sourceId);
				return {
					externalId: result.id,
					title: result.title,
					content: result.content,
					source: `${source?.type || 'unknown'}: ${source?.name || 'unknown'}`,
				};
			});

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
				`[ai] ${highConfidence.length} high-confidence insights (>= ${AI_CONFIG.minConfidence})`,
			);
			console.log(
				`[ai] ${lowConfidence.length} low-confidence items to delete`,
			);

			if (highConfidence.length > 0) {
				const newInsights = highConfidence.map((aiInsight) => ({
					scrapeResultId: aiInsight.externalId,
					category: aiInsight.category,
					summary: aiInsight.summary,
					productIdea: aiInsight.productIdea,
					confidence: aiInsight.confidence,
					tags: aiInsight.tags,
				}));

				await db.insert(insights).values(newInsights);
				console.log(`[ai] Inserted ${newInsights.length} insights into DB`);
			}

			if (lowConfidence.length > 0) {
				const idsToDelete = lowConfidence.map((i) => i.externalId);
				await db
					.delete(scrapeResults)
					.where(inArray(scrapeResults.id, idsToDelete));
				console.log(
					`[ai] Deleted ${lowConfidence.length} low-confidence scrape results`,
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

			console.log('[ai] Processing completed successfully');

			return {
				processed: highConfidence.length,
				deleted: lowConfidence.length,
				total: unprocessedResults.length,
				batchId: batch.id,
			};
		} catch (error) {
			console.error('[ai] Processing failed:', error);

			await db
				.update(processingBatches)
				.set({
					status: 'failed',
					completedAt: new Date(),
				})
				.where(eq(processingBatches.id, batch.id));

			throw error;
		}
	},
);

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
