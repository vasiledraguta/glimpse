import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { NewSource, Source, SourceConfig } from '@/db';
import { db, sources } from '@/db';

const createSourceSchema = z.object({
	type: z.enum(['reddit', 'hackernews', 'producthunt']),
	name: z.string().min(1).max(255),
	config: z.record(z.string(), z.unknown()),
	enabled: z.boolean().default(true),
});

const updateSourceSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(255).optional(),
	config: z.record(z.string(), z.unknown()).optional(),
	enabled: z.boolean().optional(),
});

const idSchema = z.object({ id: z.string().uuid() });

export const getSources = createServerFn({ method: 'GET' }).handler(
	async () => {
		const allSources = await db
			.select()
			.from(sources)
			.orderBy(sources.createdAt);
		return allSources;
	},
);

export const getSource = createServerFn({ method: 'GET' })
	.inputValidator((data: unknown) => idSchema.parse(data))
	.handler(async ({ data }) => {
		const result = await db
			.select()
			.from(sources)
			.where(eq(sources.id, data.id))
			.limit(1);
		return result[0] ?? null;
	});

export const createSource = createServerFn({ method: 'POST' })
	.inputValidator((data: unknown) => createSourceSchema.parse(data))
	.handler(async ({ data }) => {
		const newSource: NewSource = {
			type: data.type,
			name: data.name,
			config: data.config as SourceConfig,
			enabled: data.enabled,
		};

		const [created] = await db.insert(sources).values(newSource).returning();
		return created;
	});

export const updateSource = createServerFn({ method: 'POST' })
	.inputValidator((data: unknown) => updateSourceSchema.parse(data))
	.handler(async ({ data }) => {
		const { id, ...updates } = data;

		const updateData: Partial<Source> = {
			...(updates.name && { name: updates.name }),
			...(updates.config && { config: updates.config as SourceConfig }),
			...(updates.enabled !== undefined && { enabled: updates.enabled }),
			updatedAt: new Date(),
		};

		const result = await db
			.update(sources)
			.set(updateData)
			.where(eq(sources.id, id))
			.returning();

		return result[0] ?? null;
	});

export const deleteSource = createServerFn({ method: 'POST' })
	.inputValidator((data: unknown) => idSchema.parse(data))
	.handler(async ({ data }) => {
		const result = await db
			.delete(sources)
			.where(eq(sources.id, data.id))
			.returning();
		return result[0] ?? null;
	});

export const toggleSource = createServerFn({ method: 'POST' })
	.inputValidator((data: unknown) => idSchema.parse(data))
	.handler(async ({ data }) => {
		const currentResult = await db
			.select()
			.from(sources)
			.where(eq(sources.id, data.id))
			.limit(1);

		const current = currentResult.at(0);
		if (!current) return null;

		const [updated] = await db
			.update(sources)
			.set({
				enabled: !current.enabled,
				updatedAt: new Date(),
			})
			.where(eq(sources.id, data.id))
			.returning();

		return updated;
	});
