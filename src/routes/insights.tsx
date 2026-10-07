import { Link, createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconBrain } from '@tabler/icons-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TabNavigation from '@/components/tab-navigation';
import InsightsTable from '@/components/insights-table';
import InsightsFilters from '@/components/insights-filters';
import { INSIGHT_CATEGORIES, OPPORTUNITY_TYPES } from '@/lib/domain';
import { CATEGORY_LABELS } from '@/lib/ui-constants';
import { deleteInsight, getInsights } from '@/server/insights';

const ITEMS_PER_PAGE = 20;

const searchSchema = z.object({
	page: z.number().int().min(1).optional().catch(undefined),
	category: z.enum(INSIGHT_CATEGORIES).optional().catch(undefined),
	opportunityType: z.enum(OPPORTUNITY_TYPES).optional().catch(undefined),
	minConfidence: z.number().min(0).max(100).optional().catch(undefined),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/insights')({
	component: InsightsPage,
	validateSearch: searchSchema,
});

function InsightsPage() {
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();
	const {
		page: currentPage = 1,
		category,
		opportunityType,
		minConfidence: currentConfidence = 0,
	} = Route.useSearch();
	const offset = (currentPage - 1) * ITEMS_PER_PAGE;

	const filters = {
		limit: ITEMS_PER_PAGE,
		offset,
		category,
		opportunityType,
		minConfidence: currentConfidence / 100,
	};

	const { data: insights = [], isLoading } = useQuery({
		queryKey: ['insights', filters],
		queryFn: () => getInsights({ data: filters }),
	});

	const deleteMutation = useMutation({
		mutationFn: (data: { id: string }) => deleteInsight({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['insights'] });
			queryClient.invalidateQueries({ queryKey: ['insightsCount'] });
		},
	});

	const hasNextPage = insights.length === ITEMS_PER_PAGE;
	const hasPrevPage = currentPage > 1;

	const updateFilters = (updates: SearchParams) => {
		navigate({
			search: (prev) => ({ ...prev, ...updates, page: updates.page ?? 1 }),
		});
	};

	const clearFilters = () => {
		navigate({ search: {} });
	};

	const hasActiveFilters = category || opportunityType || currentConfidence > 0;

	return (
		<main className='mx-auto max-w-6xl px-4 py-6'>
			<TabNavigation />

			<div className='mt-6 space-y-6'>
				<div>
					<h2 className='text-2xl font-bold'>Insights</h2>
					<p className='text-sm text-muted-foreground'>
						AI-extracted opportunities from scraped content
					</p>
				</div>

				<InsightsFilters
					category={category}
					opportunityType={opportunityType}
					minConfidence={currentConfidence}
					onCategoryChange={(value) => updateFilters({ category: value })}
					onOpportunityTypeChange={(value) =>
						updateFilters({ opportunityType: value })
					}
					onConfidenceChange={(value) =>
						updateFilters({ minConfidence: value })
					}
					onClearFilters={clearFilters}
				/>

				{!isLoading && insights.length > 0 && (
					<div className='text-sm text-muted-foreground'>
						Showing {offset + 1}-{offset + insights.length} insights
						{hasActiveFilters && ' (filtered)'}
					</div>
				)}

				{isLoading ? (
					<InsightsTable insights={[]} isLoading />
				) : insights.length === 0 ? (
					<Card>
						<CardContent className='py-16 text-center'>
							<IconBrain className='mx-auto size-12 text-muted-foreground/50' />
							<h3 className='mt-4 text-lg font-medium'>No insights found</h3>
							<p className='mt-2 text-sm text-muted-foreground'>
								{hasActiveFilters
									? 'No insights match your filters. Try adjusting or clearing them.'
									: 'Scrape some sources and process them with AI to generate insights.'}
							</p>
							<div className='mt-6 flex justify-center gap-4'>
								{hasActiveFilters ? (
									<Button variant='outline' onClick={clearFilters}>
										Clear Filters
									</Button>
								) : (
									<>
										<Link to='/sources'>
											<Button variant='outline'>Manage Sources</Button>
										</Link>
										<Link to='/'>
											<Button>Go to Dashboard</Button>
										</Link>
									</>
								)}
							</div>
						</CardContent>
					</Card>
				) : (
					<InsightsTable
						insights={insights}
						onDelete={(id) => deleteMutation.mutate({ id })}
						isDeleting={deleteMutation.isPending}
					/>
				)}

				{!isLoading && insights.length > 0 && (
					<div className='flex items-center justify-between'>
						<p className='text-sm text-muted-foreground'>
							Page {currentPage}
							{category && ` · ${CATEGORY_LABELS[category]}`}
						</p>
						<div className='flex gap-2'>
							<Button
								variant='outline'
								disabled={!hasPrevPage}
								onClick={() => updateFilters({ page: currentPage - 1 })}
								className='cursor-pointer'
							>
								Previous
							</Button>
							<Button
								variant='outline'
								disabled={!hasNextPage}
								onClick={() => updateFilters({ page: currentPage + 1 })}
								className='cursor-pointer'
							>
								Next
							</Button>
						</div>
					</div>
				)}
			</div>
		</main>
	);
}
