import { IconLoader2 } from '@tabler/icons-react';
import type { InsightRowData } from '@/components/insight-row';
import InsightRow from '@/components/insight-row';

interface InsightsTableProps {
	insights: Array<InsightRowData>;
	isLoading?: boolean;
	onDelete?: (id: string) => void;
	isDeleting?: boolean;
}

const InsightsTable = ({
	insights,
	isLoading,
	onDelete,
	isDeleting,
}: InsightsTableProps) => {
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
					onDelete={onDelete ? () => onDelete(insight.id) : undefined}
					isDeleting={isDeleting}
				/>
			))}
		</div>
	);
};

export default InsightsTable;
