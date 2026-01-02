import { Link, createFileRoute, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
	IconBrain,
	IconBrandReddit,
	IconExternalLink,
	IconFilter,
	IconLoader2,
	IconNews,
	IconRocket,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
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

type SourceType = 'reddit' | 'hackernews' | 'producthunt';

const SOURCE_TYPE_ICONS: Record<SourceType, React.ReactNode> = {
	reddit: <IconBrandReddit className='size-4' />,
	hackernews: <IconNews className='size-4' />,
	producthunt: <IconRocket className='size-4' />,
};

const CATEGORY_COLORS: Record<string, string> = {
	complaint: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
	feature_request:
		'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
	pain_point:
		'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
	idea: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
	other: 'bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300',
};

const CATEGORY_LABELS: Record<string, string> = {
	complaint: 'Complaint',
	feature_request: 'Feature Request',
	pain_point: 'Pain Point',
	idea: 'Idea',
	other: 'Other',
};

const CATEGORIES = [
	{ value: 'all', label: 'All Categories' },
	{ value: 'complaint', label: 'Complaints' },
	{ value: 'feature_request', label: 'Feature Requests' },
	{ value: 'pain_point', label: 'Pain Points' },
	{ value: 'idea', label: 'Ideas' },
	{ value: 'other', label: 'Other' },
] as const;

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
		<div className='min-h-screen bg-background'>
			{/* Header */}
			<header className='border-b'>
				<div className='mx-auto flex max-w-6xl items-center justify-between px-4 py-4'>
					<div className='flex items-center gap-2'>
						<IconBrain className='size-6 text-primary' />
						<h1 className='text-xl font-bold'>Glimpse</h1>
					</div>
					<nav className='flex items-center gap-4'>
						<Link
							to='/'
							className='text-sm font-medium text-muted-foreground hover:text-foreground'
						>
							Dashboard
						</Link>
						<Link to='/insights' className='text-sm font-medium text-primary'>
							Insights
						</Link>
						<Link
							to='/sources'
							className='text-sm font-medium text-muted-foreground hover:text-foreground'
						>
							Sources
						</Link>
					</nav>
				</div>
			</header>

			{/* Main Content */}
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
									newCategory
										? `/insights?category=${newCategory}`
										: '/insights',
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
		</div>
	);
}

function InsightCard({
	insight,
	scrapeResult,
	source,
}: {
	insight: {
		id: string;
		category: string;
		summary: string;
		productIdea: string | null;
		confidence: number;
		tags: Array<string> | null;
		createdAt: Date;
	};
	scrapeResult: {
		title: string | null;
		url: string | null;
	};
	source: {
		type: string;
		name: string;
	};
}) {
	return (
		<Card>
			<CardHeader className='pb-2'>
				<div className='flex items-start justify-between gap-4'>
					<div className='flex items-center gap-2'>
						<Badge className={CATEGORY_COLORS[insight.category]}>
							{CATEGORY_LABELS[insight.category]}
						</Badge>
						<span className='text-xs text-muted-foreground'>
							{Math.round(insight.confidence * 100)}% confidence
						</span>
					</div>
					<div className='flex items-center gap-2 text-muted-foreground'>
						{SOURCE_TYPE_ICONS[source.type as SourceType]}
						<span className='text-xs'>{source.name}</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className='space-y-3'>
				{/* Original Title */}
				{scrapeResult.title && (
					<div className='flex items-start justify-between gap-2'>
						<p className='text-sm font-medium'>{scrapeResult.title}</p>
						{scrapeResult.url && (
							<a
								href={scrapeResult.url}
								target='_blank'
								rel='noopener noreferrer'
								className='flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
							>
								<IconExternalLink className='size-3' />
								Source
							</a>
						)}
					</div>
				)}

				{/* Summary */}
				<p className='text-sm text-muted-foreground'>{insight.summary}</p>

				{/* Product Idea */}
				{insight.productIdea && (
					<div className='rounded-md bg-muted p-3'>
						<p className='text-xs font-medium text-muted-foreground'>
							Product Idea
						</p>
						<p className='mt-1 text-sm'>{insight.productIdea}</p>
					</div>
				)}

				{/* Tags & Metadata */}
				<div className='flex flex-wrap items-center justify-between gap-2 pt-2'>
					{insight.tags && insight.tags.length > 0 && (
						<div className='flex flex-wrap gap-1'>
							{insight.tags.map((tag) => (
								<Badge key={tag} variant='outline' className='text-xs'>
									{tag}
								</Badge>
							))}
						</div>
					)}
					<span className='text-xs text-muted-foreground'>
						{new Date(insight.createdAt).toLocaleDateString()}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}
