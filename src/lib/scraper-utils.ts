import {
	FEATURE_REQUEST_KEYWORDS,
	FRUSTRATION_KEYWORDS,
	HIGH_INTENT_KEYWORDS,
	NEGATIVE_KEYWORDS,
	PROBLEM_SEEKING_KEYWORDS,
	SCRAPE_CONFIG,
} from './constants';

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function matchesKeywords(
	text: string,
	keywords: Array<string>,
): boolean {
	const lowerText = text.toLowerCase();
	return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

export function matchesNegativeKeywords(text: string): boolean {
	return matchesKeywords(text, NEGATIVE_KEYWORDS);
}

export type KeywordTier = 1 | 2 | 3 | 4;
export type KeywordCategory =
	| 'high_intent'
	| 'problem_seeking'
	| 'frustration'
	| 'feature_request';

export interface TierInfo {
	tier: KeywordTier;
	category: KeywordCategory;
}

export function getKeywordTier(text: string): TierInfo | null {
	if (matchesNegativeKeywords(text)) {
		return null;
	}

	if (matchesKeywords(text, HIGH_INTENT_KEYWORDS)) {
		return { tier: 1, category: 'high_intent' };
	}
	if (matchesKeywords(text, PROBLEM_SEEKING_KEYWORDS)) {
		return { tier: 2, category: 'problem_seeking' };
	}
	if (matchesKeywords(text, FRUSTRATION_KEYWORDS)) {
		return { tier: 3, category: 'frustration' };
	}
	if (matchesKeywords(text, FEATURE_REQUEST_KEYWORDS)) {
		return { tier: 4, category: 'feature_request' };
	}

	return null;
}

export function passesQualityFilter(
	tier: number,
	score: number,
	isComment = false,
): boolean {
	const minScore = isComment
		? SCRAPE_CONFIG.minCommentScore
		: SCRAPE_CONFIG.minPostScore;

	if (tier === 1 && SCRAPE_CONFIG.tier1BypassScoreThreshold) {
		return true;
	}

	if (tier === 2) {
		return score >= SCRAPE_CONFIG.tier2MinScore;
	}

	// Tier 3 (frustration) and Tier 4 (feature requests) use the default min score
	return score >= minScore;
}

export function stripHtml(html: string): string {
	return html
		.replace(/<[^>]*>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.replace(/&#x2F;/g, '/')
		.replace(/&nbsp;/g, ' ')
		.trim();
}
