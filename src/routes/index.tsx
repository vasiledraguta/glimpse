import { Link, createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	IconBrain,
	IconBrandReddit,
	IconExternalLink,
	IconLoader2,
	IconNews,
	IconRefresh,
	IconRocket,
	IconSettings,
	IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	getInsights,
	getProcessingStatus,
	processWithAI,
} from '@/server/insights';
import { scrapeAllSources, stopScraping } from '@/server/scrape';
import { getSources } from '@/server/sources';

export const Route = createFileRoute('/')({ component: Dashboard });

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

function Dashboard() {
	const queryClient = useQueryClient();

	const { data: insights = [], isLoading: insightsLoading } = useQuery({
		queryKey: ['insights', { limit: 10 }],
		queryFn: () => getInsights({ data: { limit: 10, offset: 0 } }),
	});

	const { data: sources = [] } = useQuery({
		queryKey: ['sources'],
		queryFn: () => getSources(),
	});

	const { data: processingStatus } = useQuery({
		queryKey: ['processingStatus'],
		queryFn: () => getProcessingStatus(),
		refetchInterval: 5000,
	});

	const scrapeMutation = useMutation({
		mutationFn: () => scrapeAllSources(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['processingStatus'] });
			queryClient.invalidateQueries({ queryKey: ['sources'] });
		},
	});

	const stopMutation = useMutation({
		mutationFn: () => stopScraping(),
	});

	const processMutation = useMutation({
		mutationFn: () => processWithAI(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['insights'] });
			queryClient.invalidateQueries({ queryKey: ['processingStatus'] });
		},
	});

	const enabledSourcesCount = sources.filter((s) => s.enabled).length;
	const unprocessedCount = processingStatus?.unprocessedCount ?? 0;

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
						<Link to='/' className='text-sm font-medium text-primary'>
							Dashboard
						</Link>
						<Link
							to='/insights'
							className='text-sm font-medium text-muted-foreground hover:text-foreground'
						>
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
				{/* Stats Cards */}
				<div className='mb-8 grid gap-4 sm:grid-cols-3'>
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>
								Active Sources
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='flex items-center justify-between'>
								<span className='text-2xl font-bold'>
									{enabledSourcesCount}
								</span>
								<Link to='/sources'>
									<Button variant='ghost' size='icon-sm'>
										<IconSettings className='size-4' />
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>
								Unprocessed Items
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='flex items-center justify-between'>
								<span className='text-2xl font-bold'>{unprocessedCount}</span>
								<Button
									variant='outline'
									size='sm'
									onClick={() => processMutation.mutate()}
									disabled={processMutation.isPending || unprocessedCount === 0}
								>
									{processMutation.isPending ? (
										<IconLoader2 className='size-4 animate-spin' />
									) : (
										<IconBrain className='size-4' />
									)}
									Process
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>
								Total Insights
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='flex items-center justify-between'>
								<span className='text-2xl font-bold'>{insights.length}+</span>
								<Link to='/insights'>
									<Button variant='ghost' size='sm'>
										View All
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Actions */}
				<div className='mb-8 flex flex-wrap gap-4'>
					<Button
						onClick={() => scrapeMutation.mutate()}
						disabled={scrapeMutation.isPending || enabledSourcesCount === 0}
					>
						{scrapeMutation.isPending ? (
							<IconLoader2
								data-icon='inline-start'
								className='size-4 animate-spin'
							/>
						) : (
							<IconRefresh data-icon='inline-start' className='size-4' />
						)}
						{scrapeMutation.isPending ? 'Scraping...' : 'Scrape All Sources'}
					</Button>

					{scrapeMutation.isPending && (
						<Button
							variant='destructive'
							onClick={() => stopMutation.mutate()}
							disabled={stopMutation.isPending}
						>
							<IconX data-icon='inline-start' className='size-4' />
							{stopMutation.isPending ? 'Stopping...' : 'Stop Scraping'}
						</Button>
					)}

					{scrapeMutation.isSuccess && (
						<div className='flex items-center gap-2 text-sm text-muted-foreground'>
							Scraped{' '}
							{scrapeMutation.data.reduce((acc, r) => acc + r.itemsFound, 0)}{' '}
							items from {scrapeMutation.data.filter((r) => r.success).length}{' '}
							sources
						</div>
					)}

					{processMutation.isSuccess && (
						<div className='flex items-center gap-2 text-sm text-muted-foreground'>
							Processed {processMutation.data.processed} items
						</div>
					)}
				</div>

				{/* Recent Insights */}
				<div>
					<div className='mb-4 flex items-center justify-between'>
						<h2 className='text-lg font-semibold'>Recent Insights</h2>
					</div>

					{insightsLoading ? (
						<div className='flex items-center justify-center py-8'>
							<IconLoader2 className='size-6 animate-spin text-muted-foreground' />
						</div>
					) : insights.length === 0 ? (
						<Card>
							<CardContent className='py-8 text-center'>
								<p className='text-muted-foreground'>
									No insights yet. Add sources and scrape to get started.
								</p>
								<div className='mt-4 flex justify-center gap-2'>
									<Link to='/sources'>
										<Button variant='outline'>Add Sources</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					) : (
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
					)}
				</div>
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
			<CardContent className='pt-4'>
				<div className='flex items-start justify-between gap-4'>
					<div className='flex-1 space-y-2'>
						<div className='flex flex-wrap items-center gap-2'>
							<Badge className={CATEGORY_COLORS[insight.category]}>
								{CATEGORY_LABELS[insight.category]}
							</Badge>
							<span className='text-xs text-muted-foreground'>
								{Math.round(insight.confidence * 100)}% confidence
							</span>
						</div>

						<p className='text-sm'>{insight.summary}</p>

						{insight.productIdea && (
							<div className='rounded-md bg-muted p-3'>
								<p className='text-xs font-medium text-muted-foreground'>
									Product Idea
								</p>
								<p className='mt-1 text-sm'>{insight.productIdea}</p>
							</div>
						)}

						{insight.tags && insight.tags.length > 0 && (
							<div className='flex flex-wrap gap-1'>
								{insight.tags.map((tag) => (
									<Badge key={tag} variant='outline' className='text-xs'>
										{tag}
									</Badge>
								))}
							</div>
						)}
					</div>

					<div className='flex flex-col items-end gap-2 text-right'>
						<div className='flex items-center gap-1 text-muted-foreground'>
							{SOURCE_TYPE_ICONS[source.type as SourceType]}
							<span className='text-xs'>{source.name}</span>
						</div>
						{scrapeResult.url && (
							<a
								href={scrapeResult.url}
								target='_blank'
								rel='noopener noreferrer'
								className='flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
							>
								<IconExternalLink className='size-3' />
								Source
							</a>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
