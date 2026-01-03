import { Link, createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	IconBrain,
	IconLoader2,
	IconRefresh,
	IconSettings,
	IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InsightCard from '@/components/insight-card';
import {
	getInsights,
	getProcessingStatus,
	processWithAI,
} from '@/server/insights';
import { scrapeAllSources, stopScraping } from '@/server/scrape';
import { getSources } from '@/server/sources';

export const Route = createFileRoute('/')({ component: Dashboard });

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
							<span className='text-2xl font-bold'>{enabledSourcesCount}</span>
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
	);
}
