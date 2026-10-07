import { describe, expect, it } from 'vitest';
import { redditConfigSchema } from './domain';

describe('redditConfigSchema', () => {
	it.each(['saas', 'r/saas', '/r/saas', '  r/saas  '])(
		'normalizes %j to the bare subreddit name',
		(subreddit) => {
			expect(redditConfigSchema.parse({ subreddit })).toEqual({
				subreddit: 'saas',
			});
		},
	);

	it('rejects an empty subreddit', () => {
		expect(redditConfigSchema.safeParse({ subreddit: 'r/' }).success).toBe(
			false,
		);
	});
});
