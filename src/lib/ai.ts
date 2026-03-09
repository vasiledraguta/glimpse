import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Output, generateText } from 'ai';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const model = google(
	process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
);

export const insightSchema = z.object({
	category: z.enum([
		'complaint',
		'feature_request',
		'pain_point',
		'idea',
		'other',
	]),
	opportunityType: z
		.enum(['gap', 'improvement', 'workflow', 'pricing', 'integration'])
		.describe(
			'gap=no good solution exists, improvement=enhance existing, workflow=manual process to automate, pricing=too expensive, integration=needs to connect tools',
		),
	summary: z.string().describe('Concise 1-2 sentence summary of the feedback'),
	productIdea: z
		.string()
		.nullable()
		.describe('Concrete product idea addressing this, or null'),
	targetCustomer: z
		.string()
		.nullable()
		.describe('Who would buy this (e.g. "indie hackers", "enterprise devs")'),
	competitorsMentioned: z
		.array(z.string())
		.describe('Names of competitors or existing solutions mentioned'),
	marketSignal: z
		.number()
		.min(0)
		.max(1)
		.describe('0-1 signal strength: would users pay to solve this?'),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe('0-1 confidence this is actionable feedback'),
	tags: z.array(z.string()).describe('Keywords for categorization'),
});

export type InsightExtraction = z.infer<typeof insightSchema>;

export const batchInsightSchema = z.object({
	insights: z.array(
		z.object({
			externalId: z.string().describe('The ID of the original content'),
			...insightSchema.shape,
		}),
	),
});

export type BatchInsightExtraction = z.infer<typeof batchInsightSchema>;

export const INSIGHT_EXTRACTION_PROMPT = `You are a product researcher identifying startup opportunities from user feedback.

For each piece of content, analyze:

## 1. Category
- complaint: Frustration with existing product/service
- feature_request: Asking for specific feature in existing product
- pain_point: Problem not tied to specific product
- idea: Suggestion or question about product that should exist
- other: Doesn't fit above

## 2. Opportunity Type
- gap: No good solution exists in market - users are stuck
- improvement: Existing solutions are inadequate - room to do better
- workflow: Manual/inefficient process that could be automated
- pricing: Existing solutions too expensive for the value
- integration: Need to connect tools that don't work together

## 3. Market Signal (0-1)
Rate how likely users would PAY to solve this:
- 0.9-1.0: Explicit "would pay" or "take my money" signals
- 0.7-0.9: Active search for alternatives, switching intent
- 0.5-0.7: Real pain but unclear if payment-worthy
- 0.3-0.5: Minor inconvenience, nice-to-have
- 0.0-0.3: Venting, no real product opportunity

## 4. Confidence (0-1)
Rate actionability - can you actually build something for this?
- 0.8-1.0: Clear problem, clear solution, identifiable customer
- 0.6-0.8: Good signal but needs more validation
- 0.4-0.6: Interesting but vague or niche
- Below 0.4: Skip - too vague or not a real opportunity

## Rules
- Extract competitors/products mentioned by name
- Identify who would buy (be specific: "solo founders" not just "developers")
- Only suggest product ideas you'd actually consider building
- If content is low-quality noise, set confidence below 0.4`;

export async function extractInsights(
	items: Array<{
		externalId: string;
		title: string | null;
		content: string | null;
		source: string;
	}>,
): Promise<BatchInsightExtraction> {
	console.log(`[ai] Analyzing ${items.length} items...`);

	const formattedContent = items
		.map(
			(item, index) =>
				`[${index + 1}] ID: ${item.externalId}
Source: ${item.source}
Title: ${item.title || 'N/A'}
Content: ${item.content || 'N/A'}
---`,
		)
		.join('\n\n');

	const startTime = Date.now();

	const result = await generateText({
		model,
		output: Output.object({ schema: batchInsightSchema }),
		prompt: `${INSIGHT_EXTRACTION_PROMPT}

Analyze this content:

${formattedContent}

Return insights for each, using externalId to reference the original.`,
	});

	const elapsed = Date.now() - startTime;
	console.log(`[ai] Completed in ${elapsed}ms`);

	const categories = result.output.insights.reduce(
		(acc, insight) => {
			acc[insight.category] = (acc[insight.category] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);
	console.log('[ai] Categories:', categories);

	const avgMarketSignal =
		result.output.insights.reduce((sum, i) => sum + i.marketSignal, 0) /
		result.output.insights.length;
	console.log(`[ai] Avg market signal: ${avgMarketSignal.toFixed(2)}`);

	return result.output;
}
