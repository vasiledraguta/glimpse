import { PAIN_POINT_KEYWORDS, RATE_LIMITS } from '../constants';
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
	user: {
		name: string;
		username: string;
	};
	comments: {
		edges: Array<{
			node: {
				id: string;
				body: string;
				createdAt: string;
				user: {
					name: string;
					username: string;
				};
			};
		}>;
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesPainPointKeywords(text: string): boolean {
	const lowerText = text.toLowerCase();
	return PAIN_POINT_KEYWORDS.some((keyword) =>
		lowerText.includes(keyword.toLowerCase()),
	);
}

async function getAccessToken(): Promise<string | null> {
	const clientId = process.env.PRODUCTHUNT_API_KEY;
	const clientSecret = process.env.PRODUCTHUNT_API_SECRET;

	if (!clientId || !clientSecret) {
		console.error('Product Hunt API credentials not configured');
		return null;
	}

	try {
		const response = await fetch('https://api.producthunt.com/v2/oauth/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'client_credentials',
			}),
		});

		if (!response.ok) {
			console.error(
				'Failed to get Product Hunt access token:',
				response.status,
			);
			return null;
		}

		const data = await response.json();
		return data.access_token;
	} catch (error) {
		console.error('Error getting Product Hunt access token:', error);
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
						id
						name
						tagline
						description
						url
						votesCount
						createdAt
						user {
							name
							username
						}
						comments(first: ${RATE_LIMITS.productHunt.maxCommentsPerPost}) {
							edges {
								node {
									id
									body
									createdAt
									user {
										name
										username
									}
								}
							}
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
			body: JSON.stringify({
				query,
				variables: { first },
			}),
		});

		if (!response.ok) {
			console.error('Failed to fetch Product Hunt posts:', response.status);
			return [];
		}

		const data = await response.json();

		if (data.errors) {
			console.error(
				'Product Hunt GraphQL errors:',
				JSON.stringify(data.errors, null, 2),
			);
			return [];
		}

		if (!data.data?.posts?.edges) {
			console.error(
				'Unexpected Product Hunt response structure:',
				JSON.stringify(data, null, 2),
			);
			return [];
		}

		return data.data.posts.edges.map(
			(edge: { node: ProductHuntPost }) => edge.node,
		);
	} catch (error) {
		console.error('Error fetching Product Hunt posts:', error);
		return [];
	}
}

export async function scrapeProductHunt(
	sourceId: string,
): Promise<Array<NewScrapeResult>> {
	const results: Array<NewScrapeResult> = [];

	console.log('Getting Product Hunt access token...');
	const accessToken = await getAccessToken();

	if (!accessToken) {
		console.error('Could not get Product Hunt access token');
		return results;
	}

	console.log('Fetching posts from Product Hunt...');
	await sleep(RATE_LIMITS.productHunt.delayMs);
	const posts = await fetchPosts(accessToken);
	console.log(`Found ${posts.length} posts`);

	for (const post of posts) {
		const postText = `${post.name} ${post.tagline} ${post.description}`;

		const interestingComments = post.comments.edges.filter((edge) =>
			matchesPainPointKeywords(edge.node.body),
		);

		if (matchesPainPointKeywords(postText) || interestingComments.length > 0) {
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
				},
				contentCreatedAt: new Date(post.createdAt),
			});

			for (const edge of interestingComments) {
				const comment = edge.node;
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
						postTagline: post.tagline,
					},
					contentCreatedAt: new Date(comment.createdAt),
				});
			}
		}
	}

	console.log(`Scraped ${results.length} items from Product Hunt`);
	return results;
}
