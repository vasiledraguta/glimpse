import { IconLoader2 } from '@tabler/icons-react';
import InsightRow from '@/components/insight-row';
import { Skeleton } from '@/components/ui/skeleton';

interface Insight {
	id: string;
	category: string;
	opportunityType: string | null;
	summary: string;
	productIdea: string | null;
	targetCustomer: string | null;
	competitorsMentioned: Array<string> | null;
	marketSignal: number | null;
	confidence: number;
	tags: Array<string> | null;
	createdAt: Date;
}

interface ScrapeResult {
	title: string | null;
	url: string | null;
}

interface Source {
	type: string;
	name: string;
}

interface InsightsTableProps {
	insights: Array<{
		insight: Insight;
		scrapeResult: ScrapeResult;
		source: Source;
	}>;
	isLoading?: boolean;
}

const InsightsTableSkeleton = () => (
	<div className='space-y-2'>
		{Array.from({ length: 5 }).map((_, i) => (
			<div
				key={i}
				className='flex items-center gap-4 rounded-lg border bg-card p-4'
			>
				<Skeleton className='h-5 w-24' />
				<Skeleton className='h-4 flex-1' />
				<Skeleton className='h-4 w-10' />
				<Skeleton className='h-4 w-20' />
				<Skeleton className='h-4 w-16' />
				<Skeleton className='size-4' />
			</div>
		))}
	</div>
);

const InsightsTable = ({ insights, isLoading }: InsightsTableProps) => {
	if (isLoading) {
		return (
			<div className='flex items-center justify-center py-16'>
				<IconLoader2 className='size-8 animate-spin text-muted-foreground' />
			</div>
		);
	}

	return (
		<div className='space-y-2'>
			{insights.map(({ insight, scrapeResult, source }) => (
				<InsightRow
					key={insight.id}
					insight={insight}
					scrapeResult={scrapeResult}
					source={source}
				/>
			))}
		</div>
	);
};

export { InsightsTable, InsightsTableSkeleton };
