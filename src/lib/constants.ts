export const PAIN_POINT_KEYWORD_CATEGORIES: Record<string, Array<string>> = {
	frustration: [
		'frustrated',
		'frustrating',
		'hate',
		'hating',
		'annoying',
		'annoyed',
		'broken',
		'sucks',
		'terrible',
		'awful',
		'horrible',
		'worst',
		'useless',
		'garbage',
		'trash',
	],

	alternatives: [
		'alternative to',
		'alternatives to',
		'better than',
		'switching from',
		'moved away from',
		'replacement for',
		'replace',
		'instead of',
		'competitor to',
	],

	needs: [
		'looking for',
		'searching for',
		'need a',
		'need an',
		'need something',
		'wish there was',
		'wish I had',
		'would pay for',
		'anyone built',
		'has anyone made',
	],

	questions: [
		'anyone know',
		'does anyone',
		'help me find',
		'recommendations for',
		'recommend a',
		'suggest a',
		'what do you use for',
		'how do you handle',
		'best way to',
		'how to solve',
	],

	problems: [
		'problem with',
		'issue with',
		'struggling with',
		"can't figure out",
		"doesn't work",
		"won't work",
		'not working',
		'keeps breaking',
		'always crashes',
		'too slow',
		'too expensive',
		'too complicated',
	],

	features: [
		'should have',
		'would be nice',
		'missing feature',
		"why doesn't",
		"why can't",
		'feature request',
		'wish it had',
		'needs to add',
		'please add',
		'hoping for',
	],
};

export const PAIN_POINT_KEYWORDS = Object.values(
	PAIN_POINT_KEYWORD_CATEGORIES,
).flat();

export const RATE_LIMITS = {
	reddit: {
		delayMs: 6000,
		maxCommentsPerPost: 50,
	},
	hackerNews: {
		delayMs: 100,
		maxResultsPerCategory: 50,
		maxTotalResults: 200,
	},
	productHunt: {
		delayMs: 1000,
		maxPostsPerRequest: 10,
		maxCommentsPerPost: 5,
	},
};

export const SCRAPE_CONFIG = {
	maxPostsFromRss: 25,
	minPostScore: 5,
	maxPostAgeHours: 72,
};

export const AI_CONFIG = {
	batchSize: 20,
	minConfidence: 0.5,
};
