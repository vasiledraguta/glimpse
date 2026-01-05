import { Link, createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	IconBrain,
	IconBulb,
	IconChevronRight,
	IconDatabase,
	IconLoader2,
	IconRefresh,
	IconStack2,
	IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TabNavigation from '@/components/tab-navigation';
import StatsCard from '@/components/stats-card';
import ActionCard from '@/components/action-card';
import InsightPreviewCard from '@/components/insight-preview-card';
import {
	getInsights,
	getInsightsCount,
	getProcessingStatus,
	processWithAI,
} from '@/server/insights';
import { scrapeAllSources, stopScraping } from '@/server/scrape';
import { getSources } from '@/server/sources';

export const Route = createFileRoute('/')({ component: Dashboard });

function Dashboard() {
	const queryClient = useQueryClient();

	const { data: insights = [], isLoading: insightsLoading } = useQuery({
		queryKey: ['insights', { limit: 5 }],
		queryFn: () => getInsights({ data: { limit: 5, offset: 0 } }),
	});

	const { data: insightsCount = 0 } = useQuery({
		queryKey: ['insightsCount'],
		queryFn: () => getInsightsCount(),
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
			queryClient.invalidateQueries({ queryKey: ['insightsCount'] });
			queryClient.invalidateQueries({ queryKey: ['processingStatus'] });
		},
	});

	const enabledSourcesCount = sources.filter((s) => s.enabled).length;
	const unprocessedCount = processingStatus?.unprocessedCount ?? 0;

	return (
		<main className='mx-auto max-w-6xl px-4 py-6'>
			<TabNavigation />

			<div className='mt-6 space-y-8'>
				{/* Stats Overview */}
				<div className='grid gap-4 sm:grid-cols-3'>
					<StatsCard
						label='Active Sources'
						value={enabledSourcesCount}
						icon={<IconDatabase className='size-5 text-muted-foreground' />}
						action={
							<Link to='/sources'>
								<Button
									variant='ghost'
									size='icon-sm'
									className='cursor-pointer'
								>
									<IconChevronRight className='size-4' />
								</Button>
							</Link>
						}
					/>
					<StatsCard
						label='Unprocessed'
						value={unprocessedCount}
						icon={<IconStack2 className='size-5 text-muted-foreground' />}
					/>
					<StatsCard
						label='Total Insights'
						value={`${insightsCount}`}
						icon={<IconBulb className='size-5 text-muted-foreground' />}
						action={
							<Link to='/insights'>
								<Button variant='ghost' size='sm' className='cursor-pointer'>
									View all
								</Button>
							</Link>
						}
					/>
				</div>

				{/* Action Center */}
				<section>
					<h2 className='mb-4 text-lg font-semibold'>Pipeline</h2>
					<div className='grid gap-4 md:grid-cols-2'>
						<ActionCard
							title='Scrape Sources'
							description='Fetch new content from all enabled sources'
							icon={<IconRefresh className='size-5' />}
							actionLabel='Scrape All'
							pendingLabel='Scraping...'
							onAction={() => scrapeMutation.mutate()}
							isPending={scrapeMutation.isPending}
							isDisabled={enabledSourcesCount === 0}
							secondaryAction={
								scrapeMutation.isPending && (
									<Button
										variant='destructive'
										size='sm'
										onClick={() => stopMutation.mutate()}
										disabled={stopMutation.isPending}
										className='cursor-pointer'
									>
										<IconX className='size-4' />
										Stop
									</Button>
								)
							}
							result={
								scrapeMutation.isSuccess && (
									<>
										Scraped{' '}
										{scrapeMutation.data.reduce(
											(acc, r) => acc + r.itemsFound,
											0,
										)}{' '}
										items from{' '}
										{scrapeMutation.data.filter((r) => r.success).length}{' '}
										sources
									</>
								)
							}
						/>

						<ActionCard
							title='Process with AI'
							description='Extract insights from unprocessed content'
							icon={<IconBrain className='size-5' />}
							actionLabel='Process'
							pendingLabel='Processing...'
							onAction={() => processMutation.mutate()}
							isPending={processMutation.isPending}
							isDisabled={unprocessedCount === 0}
							variant='secondary'
							statusBadge={
								unprocessedCount > 0 && (
									<Badge variant='secondary'>{unprocessedCount} pending</Badge>
								)
							}
							result={
								processMutation.isSuccess && (
									<>Processed {processMutation.data.processed} items</>
								)
							}
						/>
					</div>
				</section>

				{/* Recent Insights Preview */}
				<section>
					<div className='mb-4 flex items-center justify-between'>
						<h2 className='text-lg font-semibold'>Recent Insights</h2>
						<Link to='/insights'>
							<Button variant='ghost' size='sm' className='cursor-pointer'>
								View all <IconChevronRight className='size-4' />
							</Button>
						</Link>
					</div>

					{insightsLoading ? (
						<div className='flex items-center justify-center py-8'>
							<IconLoader2 className='size-6 animate-spin text-muted-foreground' />
						</div>
					) : insights.length === 0 ? (
						<div className='rounded-lg border border-dashed p-8 text-center'>
							<IconBulb className='mx-auto size-10 text-muted-foreground/50' />
							<p className='mt-3 text-sm text-muted-foreground'>
								No insights yet. Add sources and scrape to get started.
							</p>
							<Link to='/sources' className='mt-4 inline-block'>
								<Button variant='outline' size='sm'>
									Add Sources
								</Button>
							</Link>
						</div>
					) : (
						<div className='space-y-2'>
							{insights.map(({ insight, scrapeResult, source }) => (
								<InsightPreviewCard
									key={insight.id}
									insight={insight}
									scrapeResult={scrapeResult}
									source={source}
								/>
							))}
						</div>
					)}
				</section>
			</div>
		</main>
	);
}
