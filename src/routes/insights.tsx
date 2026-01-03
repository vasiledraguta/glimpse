import { Link, createFileRoute, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { IconBrain, IconFilter, IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import InsightCard from '@/components/insight-card';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/ui-constants';
import { getInsights } from '@/server/insights';

const ITEMS_PER_PAGE = 20;

type SearchParams = {
	page?: number;
	category?: 'complaint' | 'feature_request' | 'pain_point' | 'idea' | 'other';
};

export const Route = createFileRoute('/insights')({
	component: InsightsPage,
	validateSearch: (search: Record<string, unknown>): SearchParams => ({
		page: Number(search.page) || 1,
		category: search.category as SearchParams['category'],
	}),
});

function InsightsPage() {
	const { page, category } = useSearch({ from: '/insights' });
	const currentPage = page || 1;
	const offset = (currentPage - 1) * ITEMS_PER_PAGE;

	const { data: insights = [], isLoading } = useQuery({
		queryKey: ['insights', { limit: ITEMS_PER_PAGE, offset, category }],
		queryFn: () =>
			getInsights({
				data: {
					limit: ITEMS_PER_PAGE,
					offset,
					category,
				},
			}),
	});

	const hasNextPage = insights.length === ITEMS_PER_PAGE;
	const hasPrevPage = currentPage > 1;

	return (
		<main className='mx-auto max-w-6xl px-4 py-8'>
			{/* Page Header */}
			<div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h2 className='text-2xl font-bold'>Insights</h2>
					<p className='text-sm text-muted-foreground'>
						AI-extracted insights from scraped content
					</p>
				</div>

				{/* Category Filter */}
				<div className='flex items-center gap-2'>
					<IconFilter className='size-4 text-muted-foreground' />
					<Select
						value={category || 'all'}
						onValueChange={(value) => {
							const newCategory =
								value === 'all'
									? undefined
									: (value as SearchParams['category']);
							window.history.pushState(
								{},
								'',
								newCategory ? `/insights?category=${newCategory}` : '/insights',
							);
							window.location.reload();
						}}
					>
						<SelectTrigger className='w-48'>
							<SelectValue>
								{category
									? CATEGORIES.find((c) => c.value === category)?.label
									: 'All Categories'}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{CATEGORIES.map((cat) => (
								<SelectItem key={cat.value} value={cat.value}>
									{cat.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Insights List */}
			{isLoading ? (
				<div className='flex items-center justify-center py-16'>
					<IconLoader2 className='size-8 animate-spin text-muted-foreground' />
				</div>
			) : insights.length === 0 ? (
				<Card>
					<CardContent className='py-16 text-center'>
						<IconBrain className='mx-auto size-12 text-muted-foreground/50' />
						<h3 className='mt-4 text-lg font-medium'>No insights found</h3>
						<p className='mt-2 text-sm text-muted-foreground'>
							{category
								? `No ${CATEGORY_LABELS[category].toLowerCase()}s found. Try a different category or scrape more sources.`
								: 'Scrape some sources and process them with AI to generate insights.'}
						</p>
						<div className='mt-6 flex justify-center gap-4'>
							<Link to='/sources'>
								<Button variant='outline'>Manage Sources</Button>
							</Link>
							<Link to='/'>
								<Button>Go to Dashboard</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			) : (
				<>
					<div className='space-y-4'>
						{insights.map(({ insight, scrapeResult, source }) => (
							<InsightCard
								key={insight.id}
								insight={insight}
								scrapeResult={scrapeResult}
								source={source}
							/>
						))}
					</div>

					{/* Pagination */}
					<div className='mt-8 flex items-center justify-between'>
						<p className='text-sm text-muted-foreground'>
							Page {currentPage}
							{category && ` - Filtered by: ${CATEGORY_LABELS[category]}`}
						</p>
						<div className='flex gap-2'>
							<Link
								to='/insights'
								search={{
									page: currentPage - 1,
									category,
								}}
								disabled={!hasPrevPage}
							>
								<Button variant='outline' disabled={!hasPrevPage}>
									Previous
								</Button>
							</Link>
							<Link
								to='/insights'
								search={{
									page: currentPage + 1,
									category,
								}}
								disabled={!hasNextPage}
							>
								<Button variant='outline' disabled={!hasNextPage}>
									Next
								</Button>
							</Link>
						</div>
					</div>
				</>
			)}
		</main>
	);
}
