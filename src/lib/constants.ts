export const HIGH_INTENT_KEYWORDS = [
	// Purchase intent
	'would pay for',
	'take my money',
	'shut up and take my money',
	"i'd pay",
	'willing to pay',
	'happy to pay',

	// Building intent
	'built this myself',
	'building my own',
	'anyone built',
	'has anyone made',
	'thinking of building',
	'considering building',

	// Switching intent
	"i'd switch to",
	'considering switching',
	'looking to switch',
	'ready to switch',
	'evaluating alternatives',
	'evaluating options',

	// Active search
	'does anyone know of',
	'can anyone recommend',
	'what do you all use',
];

export const PROBLEM_SEEKING_KEYWORDS = [
	// Alternative seeking
	'looking for alternative',
	'looking for an alternative',
	'better alternative to',
	'alternative to',
	'alternatives to',
	'replacement for',
	'instead of',

	// Recommendation seeking
	'recommendations for',
	'recommend a',
	'recommend an',
	'suggest a',
	'suggest an',
	'suggestions for',
	'what do you use for',
	'what are you using for',
	'best tool for',
	'best app for',
	'best software for',

	// Solution seeking
	'trying to solve',
	'need a solution',
	'looking for a way',
	'how do you handle',
	'how do you deal with',
	'best way to',
	'how to solve',
	'need help with',
	'struggling to find',
];

export const FRUSTRATION_KEYWORDS = [
	// Direct frustration
	'frustrated with',
	'frustrating',
	'hate how',
	'hating',
	'annoying',
	'annoyed by',

	// Quality issues
	'broken',
	'buggy',
	'glitchy',
	'unreliable',
	"doesn't work",
	"won't work",
	'not working',
	'keeps breaking',
	'always crashes',

	// Value issues
	'too slow',
	'too expensive',
	'too complicated',
	'overpriced',
	'waste of money',
	'waste of time',

	// Strong negative sentiment
	'terrible',
	'awful',
	'horrible',
	'worst',
	'useless',
	'garbage',
	'trash',
	'sucks',
];

export const FEATURE_REQUEST_KEYWORDS = [
	'should have',
	'would be nice if',
	'wish it had',
	'wish there was',
	'missing feature',
	"why doesn't",
	"why can't",
	'feature request',
	'needs to add',
	'please add',
	'hoping they add',
	'would love if',
	'really wish',
];

export const NEGATIVE_KEYWORDS = [
	// Venting/ranting
	'just venting',
	'sorry for the rant',
	'off my chest',
	'rant over',
	'end rant',
	'/rant',

	// Job/hiring posts
	'hiring',
	"we're hiring",
	'job posting',
	'job opening',
	'looking to hire',
	'apply here',

	// Promotional content
	'discount code',
	'promo code',
	'coupon',
	'affiliate',
	'sponsored',
	'ad:',
	'[ad]',

	// Self-promotion
	'check out my',
	'i just launched',
	'just released',
	"we've just launched",
	'launching today',
	'show hn:', // These are launches, not pain points
];

export const PAIN_POINT_KEYWORDS = [
	...HIGH_INTENT_KEYWORDS,
	...PROBLEM_SEEKING_KEYWORDS,
	...FRUSTRATION_KEYWORDS,
	...FEATURE_REQUEST_KEYWORDS,
];

export const PAIN_POINT_KEYWORD_CATEGORIES: Record<string, Array<string>> = {
	highIntent: HIGH_INTENT_KEYWORDS,
	problemSeeking: PROBLEM_SEEKING_KEYWORDS,
	frustration: FRUSTRATION_KEYWORDS,
	features: FEATURE_REQUEST_KEYWORDS,
};

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
	minPostScore: 10,
	minCommentScore: 3,
	maxPostAgeHours: 72,
	tier1BypassScoreThreshold: true,
	tier2MinScore: 5,
};

export const AI_CONFIG = {
	batchSize: 20,
	minConfidence: 0.5,
	minMarketSignal: 0.6,
};
