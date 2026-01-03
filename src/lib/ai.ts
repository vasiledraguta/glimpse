import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Output, generateText } from 'ai';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const model = google('gemini-2.5-pro');

export const insightSchema = z.object({
	category: z.enum([
		'complaint',
		'feature_request',
		'pain_point',
		'idea',
		'other',
	]),
	summary: z
		.string()
		.describe('A concise 1-2 sentence summary of the user feedback'),
	productIdea: z
		.string()
		.nullable()
		.describe(
			'A potential product idea that could address this feedback, or null if not applicable',
		),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe('Confidence score from 0 to 1 that this is actionable feedback'),
	tags: z
		.array(z.string())
		.describe('Relevant tags/keywords for categorization'),
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

export const INSIGHT_EXTRACTION_PROMPT = `You are an expert at analyzing user feedback from online communities to identify product opportunities.

Analyze the following content and extract insights. For each piece of content:
1. Determine the category:
   - "complaint": User is expressing frustration with an existing product/service
   - "feature_request": User is asking for a specific feature in an existing product
   - "pain_point": User is describing a problem they face (not tied to a specific product)
   - "idea": User is suggesting or asking about a product that should exist
   - "other": Doesn't fit the above categories

2. Write a concise summary of the feedback
3. If applicable, suggest a product idea that could address this feedback
4. Assign a confidence score (0-1) based on how actionable this feedback is
5. Extract relevant tags for categorization

Focus on identifying genuine pain points and opportunities, not just complaints about minor issues.
Only mark content as actionable (confidence > 0.5) if it represents a real opportunity for a product/service.`;

export async function extractInsights(
	items: Array<{
		externalId: string;
		title: string | null;
		content: string | null;
		source: string;
	}>,
): Promise<BatchInsightExtraction> {
	console.log(`[ai:gemini] Preparing ${items.length} items for analysis...`);

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

	console.log(
		`[ai:gemini] Sending request to Gemini (${formattedContent.length} chars)...`,
	);
	const startTime = Date.now();

	const result = await generateText({
		model,
		output: Output.object({
			schema: batchInsightSchema,
		}),
		prompt: `${INSIGHT_EXTRACTION_PROMPT}

Content to analyze:

${formattedContent}

Return insights for each piece of content, using the externalId to reference back to the original.`,
	});

	const elapsed = Date.now() - startTime;
	console.log(`[ai:gemini] Response received in ${elapsed}ms`);
	console.log(
		`[ai:gemini] Extracted ${result.output.insights.length} insights`,
	);

	const categories = result.output.insights.reduce(
		(acc, insight) => {
			acc[insight.category] = (acc[insight.category] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);
	console.log('[ai:gemini] Categories breakdown:', categories);

	return result.output;
}
