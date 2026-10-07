import { describe, expect, it } from 'vitest';
import {
	getKeywordTier,
	matchesKeywords,
	passesQualityFilter,
	stripHtml,
} from './scraper-utils';
import { SCRAPE_CONFIG } from './constants';

describe('matchesKeywords', () => {
	it('matches case-insensitively', () => {
		expect(matchesKeywords('Take My Money now', ['take my money'])).toBe(true);
		expect(matchesKeywords('nothing here', ['take my money'])).toBe(false);
	});
});

describe('getKeywordTier', () => {
	it('ranks purchase intent as tier 1', () => {
		expect(getKeywordTier("I'd pay for a tool that does this")).toEqual({
			tier: 1,
			category: 'high_intent',
		});
	});

	it('ranks alternative seeking as tier 2', () => {
		expect(getKeywordTier('Looking for an alternative to Notion')).toEqual({
			tier: 2,
			category: 'problem_seeking',
		});
	});

	it('ranks frustration as tier 3', () => {
		expect(getKeywordTier('This app is so buggy')).toEqual({
			tier: 3,
			category: 'frustration',
		});
	});

	it('ranks feature requests as tier 4', () => {
		expect(getKeywordTier('It would be nice if it synced')).toEqual({
			tier: 4,
			category: 'feature_request',
		});
	});

	it('prefers the highest tier when several match', () => {
		expect(
			getKeywordTier('So buggy, willing to pay for something else'),
		).toMatchObject({ tier: 1 });
	});

	it('rejects negative keywords even when other keywords match', () => {
		expect(getKeywordTier("We're hiring! Would pay for good devs")).toBeNull();
	});

	it('returns null when nothing matches', () => {
		expect(getKeywordTier('A nice day at the beach')).toBeNull();
	});
});

describe('passesQualityFilter', () => {
	it('lets tier 1 through regardless of score', () => {
		expect(passesQualityFilter(1, 0)).toBe(true);
	});

	it('uses the tier 2 minimum score', () => {
		expect(passesQualityFilter(2, SCRAPE_CONFIG.tier2MinScore)).toBe(true);
		expect(passesQualityFilter(2, SCRAPE_CONFIG.tier2MinScore - 1)).toBe(false);
	});

	it('uses separate thresholds for posts and comments', () => {
		expect(passesQualityFilter(3, SCRAPE_CONFIG.minPostScore)).toBe(true);
		expect(passesQualityFilter(3, SCRAPE_CONFIG.minPostScore - 1)).toBe(false);
		expect(passesQualityFilter(4, SCRAPE_CONFIG.minCommentScore, true)).toBe(
			true,
		);
		expect(
			passesQualityFilter(4, SCRAPE_CONFIG.minCommentScore - 1, true),
		).toBe(false);
	});
});

describe('stripHtml', () => {
	it('removes tags and decodes common entities', () => {
		expect(stripHtml('<p>Tom &amp; Jerry&#x27;s &lt;tool&gt;&nbsp;</p> ')).toBe(
			"Tom & Jerry's <tool>",
		);
	});
});
