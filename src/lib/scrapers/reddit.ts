import Parser from 'rss-parser';
import { RATE_LIMITS } from '../constants';
import { getKeywordTier, passesQualityFilter, sleep } from '../scraper-utils';
import type { NewScrapeResult } from '@/db';

const parser = new Parser();

interface RedditPost {
	id: string;
	title: string;
	selftext: string;
	author: string;
	permalink: string;
	score: number;
	created_utc: number;
	num_comments: number;
}

interface RedditComment {
	id: string;
	body: string;
	author: string;
	permalink: string;
	score: number;
	created_utc: number;
	parent_id: string;
	replies?: {
		data?: {
			children?: Array<{ data: RedditComment }>;
		};
	};
}

async function fetchPostsViaRss(subreddit: string): Promise<Array<RedditPost>> {
	try {
		const feed = await parser.parseURL(
			`https://www.reddit.com/r/${subreddit}/new.rss`,
		);

		return feed.items.map((item) => {
			const idMatch = item.link?.match(/\/comments\/([a-z0-9]+)\//);
			const id = idMatch ? idMatch[1] : item.guid || '';

			return {
				id,
				title: item.title || '',
				selftext: item.contentSnippet || item.content || '',
				author: item.creator || '',
				permalink: item.link?.replace('https://www.reddit.com', '') || '',
				score: 0,
				created_utc: item.isoDate
					? new Date(item.isoDate).getTime() / 1000
					: Date.now() / 1000,
				num_comments: 0,
			};
		});
	} catch (error) {
		console.error(`Error fetching RSS for r/${subreddit}:`, error);
		return [];
	}
}

async function fetchPostWithComments(
	subreddit: string,
	postId: string,
): Promise<{ post: RedditPost; comments: Array<RedditComment> } | null> {
	try {
		const response = await fetch(
			`https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=${RATE_LIMITS.reddit.maxCommentsPerPost}&sort=top`,
			{ headers: { 'User-Agent': 'Glimpse/1.0.0 (personal research tool)' } },
		);

		if (!response.ok) {
			console.error(`Error fetching post ${postId}: ${response.status}`);
			return null;
		}

		const data = await response.json();
		const postData = data[0]?.data?.children?.[0]?.data as
			| RedditPost
			| undefined;
		const commentsData = data[1]?.data?.children || [];

		if (!postData) return null;

		const comments: Array<RedditComment> = [];

		function extractComments(
			children: Array<{ kind?: string; data: RedditComment }>,
			depth = 0,
		) {
			if (depth > 3) return;
			for (const child of children) {
				if (!child.kind || child.kind === 't1') {
					comments.push(child.data);
					if (child.data.replies?.data?.children) {
						extractComments(child.data.replies.data.children, depth + 1);
					}
				}
			}
		}

		extractComments(commentsData);

		return {
			post: postData,
			comments: comments.slice(0, RATE_LIMITS.reddit.maxCommentsPerPost),
		};
	} catch (error) {
		console.error(`Error fetching post ${postId}:`, error);
		return null;
	}
}

export async function scrapeSubreddit(
	sourceId: string,
	subreddit: string,
): Promise<Array<NewScrapeResult>> {
	const results: Array<NewScrapeResult> = [];

	console.log(`[reddit] Fetching posts from r/${subreddit}...`);
	const posts = await fetchPostsViaRss(subreddit);
	console.log(`[reddit] Found ${posts.length} posts`);

	const potentiallyInteresting = posts.filter((post) => {
		const text = `${post.title} ${post.selftext}`;
		return getKeywordTier(text) !== null;
	});

	console.log(`[reddit] ${potentiallyInteresting.length} posts match keywords`);

	for (const post of potentiallyInteresting) {
		await sleep(RATE_LIMITS.reddit.delayMs);
		const fullPost = await fetchPostWithComments(subreddit, post.id);
		if (!fullPost) continue;

		const postText = `${fullPost.post.title} ${fullPost.post.selftext}`;
		const postTierInfo = getKeywordTier(postText);

		if (
			postTierInfo &&
			passesQualityFilter(postTierInfo.tier, fullPost.post.score)
		) {
			results.push({
				sourceId,
				externalId: fullPost.post.id,
				type: 'post',
				title: fullPost.post.title,
				content: fullPost.post.selftext,
				author: fullPost.post.author,
				url: `https://www.reddit.com${fullPost.post.permalink}`,
				score: fullPost.post.score,
				metadata: {
					subreddit,
					numComments: fullPost.post.num_comments,
					keywordTier: postTierInfo.tier,
					keywordCategory: postTierInfo.category,
				},
				contentCreatedAt: new Date(fullPost.post.created_utc * 1000),
			});
		}

		for (const comment of fullPost.comments) {
			const commentTierInfo = getKeywordTier(comment.body);
			if (
				commentTierInfo &&
				passesQualityFilter(commentTierInfo.tier, comment.score, true)
			) {
				results.push({
					sourceId,
					externalId: comment.id,
					type: 'comment',
					title: null,
					content: comment.body,
					author: comment.author,
					url: `https://www.reddit.com${comment.permalink}`,
					score: comment.score,
					parentId: fullPost.post.id,
					metadata: {
						subreddit,
						postTitle: fullPost.post.title,
						keywordTier: commentTierInfo.tier,
						keywordCategory: commentTierInfo.category,
					},
					contentCreatedAt: new Date(comment.created_utc * 1000),
				});
			}
		}
	}

	console.log(`[reddit] Scraped ${results.length} items from r/${subreddit}`);
	return results;
}
