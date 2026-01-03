import { IconExternalLink } from '@tabler/icons-react';
import type { SourceType } from '@/lib/ui-constants';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	CATEGORY_COLORS,
	CATEGORY_LABELS,
	SOURCE_TYPE_ICONS,
} from '@/lib/ui-constants';

export interface InsightCardProps {
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
}

const InsightCard = ({ insight, scrapeResult, source }: InsightCardProps) => {
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
				{/* Original Title & Source Link */}
				<div className='flex items-start justify-between gap-2'>
					{scrapeResult.title ? (
						<p className='text-sm font-medium'>{scrapeResult.title}</p>
					) : (
						<div className='flex-1' />
					)}
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
};

export default InsightCard;
