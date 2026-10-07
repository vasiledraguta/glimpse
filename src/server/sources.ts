import { createServerFn } from '@tanstack/react-start';
import { eq, not } from 'drizzle-orm';
import { z } from 'zod';
import { db, sources } from '@/db';
import {
	hackerNewsConfigSchema,
	productHuntConfigSchema,
	redditConfigSchema,
} from '@/lib/domain';

const sourceFields = {
	name: z.string().trim().min(1).max(255),
	enabled: z.boolean().default(true),
};

const createSourceSchema = z.discriminatedUnion('type', [
	z.object({
		...sourceFields,
		type: z.literal('reddit'),
		config: redditConfigSchema,
	}),
	z.object({
		...sourceFields,
		type: z.literal('hackernews'),
		config: hackerNewsConfigSchema,
	}),
	z.object({
		...sourceFields,
		type: z.literal('producthunt'),
		config: productHuntConfigSchema,
	}),
]);

export type CreateSourceInput = z.input<typeof createSourceSchema>;

const updateSourceSchema = z.object({
	id: z.uuid(),
	name: sourceFields.name.optional(),
	config: z
		.union([
			redditConfigSchema,
			hackerNewsConfigSchema,
			productHuntConfigSchema,
		])
		.optional(),
	enabled: z.boolean().optional(),
});

const idSchema = z.object({ id: z.uuid() });

export const getSources = createServerFn({ method: 'GET' }).handler(() =>
	db.select().from(sources).orderBy(sources.createdAt),
);

export const getSource = createServerFn({ method: 'GET' })
	.validator(idSchema)
	.handler(async ({ data }) => {
		const [source] = await db
			.select()
			.from(sources)
			.where(eq(sources.id, data.id))
			.limit(1);
		return source ?? null;
	});

export const createSource = createServerFn({ method: 'POST' })
	.validator(createSourceSchema)
	.handler(async ({ data }) => {
		const [created] = await db.insert(sources).values(data).returning();
		return created;
	});

export const updateSource = createServerFn({ method: 'POST' })
	.validator(updateSourceSchema)
	.handler(async ({ data: { id, ...updates } }) => {
		const [updated] = await db
			.update(sources)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(sources.id, id))
			.returning();
		return updated ?? null;
	});

export const deleteSource = createServerFn({ method: 'POST' })
	.validator(idSchema)
	.handler(async ({ data }) => {
		const [deleted] = await db
			.delete(sources)
			.where(eq(sources.id, data.id))
			.returning();
		return deleted ?? null;
	});

export const toggleSource = createServerFn({ method: 'POST' })
	.validator(idSchema)
	.handler(async ({ data }) => {
		const [updated] = await db
			.update(sources)
			.set({ enabled: not(sources.enabled), updatedAt: new Date() })
			.where(eq(sources.id, data.id))
			.returning();
		return updated ?? null;
	});
