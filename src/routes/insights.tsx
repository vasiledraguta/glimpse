import {
	Link,
	createFileRoute,
	useNavigate,
	useSearch,
} from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconBrain } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TabNavigation from '@/components/tab-navigation';
import { InsightsTable } from '@/components/insights-table';
import InsightsFilters from '@/components/insights-filters';
import { CATEGORY_LABELS } from '@/lib/ui-constants';
import { deleteInsight, getInsights } from '@/server/insights';

const ITEMS_PER_PAGE = 20;

type SearchParams = {
	page?: number;
	category?: 'complaint' | 'feature_request' | 'pain_point' | 'idea' | 'other';
	opportunityType?:
		| 'gap'
		| 'improvement'
		| 'workflow'
		| 'pricing'
		| 'integration';
	minConfidence?: number;
};

export const Route = createFileRoute('/insights')({
	component: InsightsPage,
	validateSearch: (search: Record<string, unknown>): SearchParams => ({
		page: Number(search.page) || 1,
		category: search.category as SearchParams['category'],
		opportunityType: search.opportunityType as SearchParams['opportunityType'],
		minConfidence: Number(search.minConfidence) || 0,
	}),
});

function InsightsPage() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { page, category, opportunityType, minConfidence } = useSearch({
		from: '/insights',
	});
	const currentPage = page || 1;
	const currentConfidence = minConfidence || 0;
	const offset = (currentPage - 1) * ITEMS_PER_PAGE;

	const { data: insights = [], isLoading } = useQuery({
		queryKey: [
			'insights',
			{
				limit: ITEMS_PER_PAGE,
				offset,
				category,
				opportunityType,
				minConfidence: currentConfidence / 100,
			},
		],
		queryFn: () =>
			getInsights({
				data: {
					limit: ITEMS_PER_PAGE,
					offset,
					category,
					opportunityType,
					minConfidence: currentConfidence / 100,
				},
			}),
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

	const updateFilters = (updates: Partial<SearchParams>) => {
		navigate({
			to: '/insights',
			search: {
				page:
					updates.page !== undefined
						? updates.page
						: updates.category !== undefined ||
							  updates.opportunityType !== undefined ||
							  updates.minConfidence !== undefined
							? 1
							: currentPage,
				category: updates.category !== undefined ? updates.category : category,
				opportunityType:
					updates.opportunityType !== undefined
						? updates.opportunityType
						: opportunityType,
				minConfidence:
					updates.minConfidence !== undefined
						? updates.minConfidence
						: currentConfidence,
			},
		});
	};

	const clearFilters = () => {
		navigate({
			to: '/insights',
			search: { page: 1 },
		});
	};

	const hasActiveFilters = category || opportunityType || currentConfidence > 0;

	return (
		<main className='mx-auto max-w-6xl px-4 py-6'>
			<TabNavigation />

			<div className='mt-6 space-y-6'>
				{/* Page Header */}
				<div>
					<h2 className='text-2xl font-bold'>Insights</h2>
					<p className='text-sm text-muted-foreground'>
						AI-extracted opportunities from scraped content
					</p>
				</div>

				{/* Filters */}
				<InsightsFilters
					category={category}
					opportunityType={opportunityType}
					minConfidence={currentConfidence}
					onCategoryChange={(value) =>
						updateFilters({ category: value as SearchParams['category'] })
					}
					onOpportunityTypeChange={(value) =>
						updateFilters({
							opportunityType: value as SearchParams['opportunityType'],
						})
					}
					onConfidenceChange={(value) =>
						updateFilters({ minConfidence: value })
					}
					onClearFilters={clearFilters}
				/>

				{/* Results Info */}
				{!isLoading && insights.length > 0 && (
					<div className='text-sm text-muted-foreground'>
						Showing {offset + 1}-{offset + insights.length} insights
						{hasActiveFilters && ' (filtered)'}
					</div>
				)}

				{/* Insights Table */}
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

				{/* Pagination */}
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
