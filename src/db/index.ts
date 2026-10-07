import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export function firstOrThrow<T>(rows: Array<T>): T {
	const [row] = rows;
	if (row === undefined) {
		throw new Error('Expected query to return at least one row');
	}
	return row;
}

export * from './schema';
