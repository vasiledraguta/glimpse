import type { Insight, ScrapeResult, Source } from '@/db/schema';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_COLORS, SOURCE_TYPE_ICONS } from '@/lib/ui-constants';
import { cn } from '@/lib/utils';

interface InsightPreviewCardProps {
	insight: Pick<Insight, 'id' | 'category' | 'summary' | 'confidence'>;
	scrapeResult: Pick<ScrapeResult, 'url'>;
	source: Pick<Source, 'type' | 'name'>;
}

const InsightPreviewCard = ({
	insight,
	scrapeResult,
	source,
}: InsightPreviewCardProps) => (
	<div className='flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50'>
		<Badge
			className={cn(
				'w-24 shrink-0 justify-center',
				CATEGORY_COLORS[insight.category],
			)}
		>
			{insight.category.replace('_', ' ')}
		</Badge>
		<p className='min-w-0 flex-1 truncate text-sm'>{insight.summary}</p>
		<div className='flex shrink-0 items-center gap-3 text-xs text-muted-foreground'>
			<span className='flex items-center gap-1'>
				{SOURCE_TYPE_ICONS[source.type]}
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
