import { Badge } from '@/components/ui/badge';
import { CATEGORY_COLORS, SOURCE_TYPE_ICONS } from '@/lib/ui-constants';

interface InsightPreviewCardProps {
	insight: {
		id: string;
		category: string;
		summary: string;
		confidence: number;
	};
	scrapeResult: {
		url: string | null;
	};
	source: {
		type: string;
		name: string;
	};
}

const InsightPreviewCard = ({
	insight,
	scrapeResult,
	source,
}: InsightPreviewCardProps) => (
	<div className='flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50'>
		<Badge
			className={`w-24 shrink-0 justify-center ${CATEGORY_COLORS[insight.category] || ''}`}
		>
			{insight.category.replace('_', ' ')}
		</Badge>
		<p className='min-w-0 flex-1 truncate text-sm'>{insight.summary}</p>
		<div className='flex shrink-0 items-center gap-3 text-xs text-muted-foreground'>
			<span className='flex items-center gap-1'>
				{SOURCE_TYPE_ICONS[source.type as keyof typeof SOURCE_TYPE_ICONS]}
				{source.name}
			</span>
			<span>{Math.round(insight.confidence * 100)}%</span>
			{scrapeResult.url && (
				<a
					href={scrapeResult.url}
					target='_blank'
					rel='noopener noreferrer'
					className='hover:underline'
				>
					Source
				</a>
			)}
		</div>
	</div>
);

export default InsightPreviewCard;
