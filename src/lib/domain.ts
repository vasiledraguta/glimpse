import { z } from 'zod';

export const SOURCE_TYPES = ['reddit', 'hackernews', 'producthunt'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const CONTENT_TYPES = ['post', 'comment'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const INSIGHT_CATEGORIES = [
	'complaint',
	'feature_request',
	'pain_point',
	'idea',
	'other',
] as const;
export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number];

export const OPPORTUNITY_TYPES = [
	'gap',
	'improvement',
	'workflow',
	'pricing',
	'integration',
] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const BATCH_STATUSES = [
	'pending',
	'processing',
	'completed',
	'failed',
] as const;

export const redditConfigSchema = z.object({
	subreddit: z
		.string()
		.trim()
		.transform((value) => value.replace(/^\/?r\//, ''))
		.pipe(z.string().min(1)),
});

export const hackerNewsConfigSchema = z.object({
	includeAskHN: z.boolean(),
	includeShowHN: z.boolean(),
	includeJobs: z.boolean(),
});

export const productHuntConfigSchema = z.object({
	includeLaunches: z.boolean(),
	includeDiscussions: z.boolean(),
});

export type RedditConfig = z.infer<typeof redditConfigSchema>;
export type HackerNewsConfig = z.infer<typeof hackerNewsConfigSchema>;
export type ProductHuntConfig = z.infer<typeof productHuntConfigSchema>;
export type SourceConfig = RedditConfig | HackerNewsConfig | ProductHuntConfig;
