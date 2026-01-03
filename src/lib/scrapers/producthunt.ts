import { RATE_LIMITS } from '../constants';
import { getKeywordTier, sleep } from '../scraper-utils';
import type { NewScrapeResult } from '@/db';

const PH_API_URL = 'https://api.producthunt.com/v2/api/graphql';

interface ProductHuntPost {
	id: string;
	name: string;
	tagline: string;
	description: string;
	url: string;
	votesCount: number;
	createdAt: string;
	user: { name: string; username: string };
	comments: {
		edges: Array<{
			node: {
				id: string;
				body: string;
				createdAt: string;
				user: { name: string; username: string };
			};
		}>;
	};
}

function isQuestion(text: string): boolean {
	return text.includes('?') || text.toLowerCase().startsWith('does ');
}

function calculateEngagementSignal(
	votesCount: number,
	commentsCount: number,
): 'high' | 'medium' | 'low' {
	const ratio = commentsCount / Math.max(votesCount, 1);
	if (ratio > 0.5 || commentsCount > 10) return 'high';
	if (ratio > 0.2 || commentsCount > 5) return 'medium';
	return 'low';
}

async function getAccessToken(): Promise<string | null> {
	const clientId = process.env.PRODUCTHUNT_API_KEY;
	const clientSecret = process.env.PRODUCTHUNT_API_SECRET;

	if (!clientId || !clientSecret) {
		console.error('[PH] API credentials not configured');
		return null;
	}

	try {
		const response = await fetch('https://api.producthunt.com/v2/oauth/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'client_credentials',
			}),
		});

		if (!response.ok) {
			console.error('[PH] Failed to get access token:', response.status);
			return null;
		}

		const data = await response.json();
		return data.access_token;
	} catch (error) {
		console.error('[PH] Error getting access token:', error);
		return null;
	}
}

async function fetchPosts(
	accessToken: string,
	first = RATE_LIMITS.productHunt.maxPostsPerRequest,
): Promise<Array<ProductHuntPost>> {
	const query = `
		query GetPosts($first: Int!) {
			posts(first: $first, order: NEWEST) {
				edges {
					node {
						id name tagline description url votesCount createdAt
						user { name username }
						comments(first: 10) {
							edges { node { id body createdAt user { name username } } }
						}
					}
				}
			}
		}
	`;

	try {
		const response = await fetch(PH_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({ query, variables: { first } }),
		});

		if (!response.ok) {
			console.error('[PH] Failed to fetch posts:', response.status);
			return [];
		}

		const data = await response.json();
		if (data.errors) {
			console.error('[PH] GraphQL errors:', JSON.stringify(data.errors));
			return [];
		}

		return (
			data.data?.posts?.edges?.map(
				(edge: { node: ProductHuntPost }) => edge.node,
			) || []
		);
	} catch (error) {
		console.error('[PH] Error fetching posts:', error);
		return [];
	}
}

export async function scrapeProductHunt(
	sourceId: string,
): Promise<Array<NewScrapeResult>> {
	const results: Array<NewScrapeResult> = [];

	console.log('[PH] Getting access token...');
	const accessToken = await getAccessToken();
	if (!accessToken) return results;

	console.log('[PH] Fetching posts...');
	await sleep(RATE_LIMITS.productHunt.delayMs);
	const posts = await fetchPosts(accessToken);
	console.log(`[PH] Found ${posts.length} posts`);

	for (const post of posts) {
		const postText = `${post.name} ${post.tagline} ${post.description}`;
		const postTierInfo = getKeywordTier(postText);
		const engagementSignal = calculateEngagementSignal(
			post.votesCount,
			post.comments.edges.length,
		);

		const interestingComments: Array<{
			comment: (typeof post.comments.edges)[0]['node'];
			tierInfo: NonNullable<ReturnType<typeof getKeywordTier>>;
			isQ: boolean;
		}> = [];

		for (const edge of post.comments.edges) {
			const comment = edge.node;
			const commentTierInfo = getKeywordTier(comment.body);
			if (commentTierInfo || isQuestion(comment.body)) {
				interestingComments.push({
					comment,
					tierInfo: commentTierInfo || { tier: 4, category: 'feature_request' },
					isQ: isQuestion(comment.body),
				});
			}
		}

		const shouldInclude =
			postTierInfo !== null ||
			interestingComments.length > 0 ||
			engagementSignal === 'high';

		if (shouldInclude) {
			results.push({
				sourceId,
				externalId: post.id,
				type: 'post',
				title: post.name,
				content: `${post.tagline}\n\n${post.description}`,
				author: post.user.username,
				url: post.url,
				score: post.votesCount,
				metadata: {
					tagline: post.tagline,
					numComments: post.comments.edges.length,
					keywordTier: postTierInfo?.tier ?? 4,
					keywordCategory: postTierInfo?.category ?? 'engagement',
					engagementSignal,
				},
				contentCreatedAt: new Date(post.createdAt),
			});

			for (const { comment, tierInfo, isQ } of interestingComments) {
				results.push({
					sourceId,
					externalId: comment.id,
					type: 'comment',
					title: null,
					content: comment.body,
					author: comment.user.username,
					url: `${post.url}#comment-${comment.id}`,
					score: 0,
					parentId: post.id,
					metadata: {
						postName: post.name,
						keywordTier: tierInfo.tier,
						keywordCategory: tierInfo.category,
						isQuestion: isQ,
					},
					contentCreatedAt: new Date(comment.createdAt),
				});
			}
		}
	}

	console.log(`[PH] Scraped ${results.length} items`);
	return results;
}
