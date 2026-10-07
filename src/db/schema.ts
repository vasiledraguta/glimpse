import {
	boolean,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import {
	BATCH_STATUSES,
	CONTENT_TYPES,
	INSIGHT_CATEGORIES,
	OPPORTUNITY_TYPES,
	SOURCE_TYPES,
} from '../lib/domain';
import type { SourceConfig } from '../lib/domain';

export type {
	HackerNewsConfig,
	ProductHuntConfig,
	RedditConfig,
	SourceConfig,
} from '../lib/domain';

// Enums
export const sourceTypeEnum = pgEnum('source_type', SOURCE_TYPES);

export const contentTypeEnum = pgEnum('content_type', CONTENT_TYPES);

export const insightCategoryEnum = pgEnum(
	'insight_category',
	INSIGHT_CATEGORIES,
);

export const opportunityTypeEnum = pgEnum(
	'opportunity_type',
	OPPORTUNITY_TYPES,
);

export const batchStatusEnum = pgEnum('batch_status', BATCH_STATUSES);

// Tables
export const sources = pgTable('sources', {
	id: uuid('id').primaryKey().defaultRandom(),
	type: sourceTypeEnum('type').notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	config: jsonb('config').$type<SourceConfig>().notNull(),
	enabled: boolean('enabled').default(true).notNull(),
	lastScrapedAt: timestamp('last_scraped_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const scrapeResults = pgTable(
	'scrape_results',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sourceId: uuid('source_id')
			.references(() => sources.id, { onDelete: 'cascade' })
			.notNull(),
		externalId: varchar('external_id', { length: 255 }).notNull(),
		type: contentTypeEnum('type').notNull(),
		title: varchar('title', { length: 1000 }),
		content: text('content'),
		author: varchar('author', { length: 255 }),
		url: varchar('url', { length: 2000 }),
		score: integer('score'),
		parentId: varchar('parent_id', { length: 255 }),
		metadata:
			jsonb('metadata').$type<
				Record<string, string | number | boolean | null>
			>(),
		scrapedAt: timestamp('scraped_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		contentCreatedAt: timestamp('content_created_at', { withTimezone: true }),
	},
	(table) => [
		unique('unique_source_external').on(table.sourceId, table.externalId),
	],
);

export const insights = pgTable('insights', {
	id: uuid('id').primaryKey().defaultRandom(),
	scrapeResultId: uuid('scrape_result_id')
		.references(() => scrapeResults.id, { onDelete: 'cascade' })
		.notNull()
		.unique(),
	category: insightCategoryEnum('category').notNull(),
	opportunityType: opportunityTypeEnum('opportunity_type'),
	summary: text('summary').notNull(),
	productIdea: text('product_idea'),
	targetCustomer: text('target_customer'),
	competitorsMentioned: text('competitors_mentioned').array(),
	marketSignal: real('market_signal'),
	confidence: real('confidence').notNull(),
	tags: text('tags').array(),
	processedAt: timestamp('processed_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const processingBatches = pgTable('processing_batches', {
	id: uuid('id').primaryKey().defaultRandom(),
	status: batchStatusEnum('status').default('pending').notNull(),
	totalItems: integer('total_items').default(0).notNull(),
	processedItems: integer('processed_items').default(0).notNull(),
	startedAt: timestamp('started_at', { withTimezone: true }),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
});

// Types
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

export type ScrapeResult = typeof scrapeResults.$inferSelect;
export type NewScrapeResult = typeof scrapeResults.$inferInsert;

export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;

export type ProcessingBatch = typeof processingBatches.$inferSelect;
export type NewProcessingBatch = typeof processingBatches.$inferInsert;
