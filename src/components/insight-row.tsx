import { useState } from 'react';
import {
	IconBulb,
	IconChevronDown,
	IconExternalLink,
	IconX,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
	CATEGORY_COLORS,
	OPPORTUNITY_TYPE_COLORS,
	OPPORTUNITY_TYPE_LABELS,
	SOURCE_TYPE_ICONS,
} from '@/lib/ui-constants';
import { cn } from '@/lib/utils';

interface InsightRowProps {
	insight: {
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
	};
	scrapeResult: {
		title: string | null;
		url: string | null;
	};
	source: {
		type: string;
		name: string;
	};
	onDelete?: () => void;
	isDeleting?: boolean;
}

const InsightRow = ({
	insight,
	scrapeResult,
	source,
	onDelete,
	isDeleting,
}: InsightRowProps) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const sourceIcon =
		SOURCE_TYPE_ICONS[source.type as keyof typeof SOURCE_TYPE_ICONS];
	const categoryColor = CATEGORY_COLORS[insight.category] || '';
	const opportunityColor =
		insight.opportunityType && OPPORTUNITY_TYPE_COLORS[insight.opportunityType];
	const opportunityLabel =
		insight.opportunityType && OPPORTUNITY_TYPE_LABELS[insight.opportunityType];

	const formattedDate = new Date(insight.createdAt).toLocaleDateString(
		'en-US',
		{
			month: 'short',
			day: 'numeric',
		},
	);

	return (
		<Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
			<div
				className={cn(
					'rounded-lg border bg-card transition-colors',
					isExpanded && 'ring-1 ring-primary/20',
				)}
			>
				<div className='grid w-full grid-cols-[6rem_1fr_3.5rem_8rem_4rem_auto_auto] items-center gap-4 p-4'>
					<Badge className={cn('w-24 shrink-0 justify-center', categoryColor)}>
						{insight.category.replace('_', ' ')}
					</Badge>

					<p className='min-w-0 truncate text-sm'>{insight.summary}</p>

					<span
						className={cn(
							'text-xs font-medium tabular-nums text-right',
							insight.confidence >= 0.8
								? 'text-emerald-600 dark:text-emerald-400'
								: insight.confidence >= 0.6
									? 'text-amber-600 dark:text-amber-400'
									: 'text-muted-foreground',
						)}
					>
						{Math.round(insight.confidence * 100)}%
					</span>

					<span className='flex shrink-0 items-center gap-1 text-xs text-muted-foreground'>
						{sourceIcon}
						<span className='hidden sm:inline'>{source.name}</span>
					</span>

					<span className='shrink-0 text-xs text-muted-foreground'>
						{formattedDate}
					</span>

					<CollapsibleTrigger className='flex size-8 cursor-pointer items-center justify-center rounded-[min(var(--radius-md),10px)] transition-colors duration-200 ease hover:bg-muted'>
						<IconChevronDown
							className={cn(
								'size-4 text-muted-foreground transition-transform duration-200 ease-out ',
								isExpanded && 'rotate-180',
							)}
						/>
					</CollapsibleTrigger>

					{onDelete && (
						<AlertDialog>
							<AlertDialogTrigger>
								<Button
									variant='ghost'
									size='icon-sm'
									className='shrink-0 cursor-pointer text-destructive hover:text-destructive'
								>
									<IconX className='size-4' />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete Insight</AlertDialogTitle>
									<AlertDialogDescription>
										Are you sure you want to delete this insight? This action
										cannot be undone.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										onClick={onDelete}
										disabled={isDeleting}
										className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
									>
										{isDeleting ? 'Deleting...' : 'Delete'}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</div>

				<CollapsibleContent className='transition-all duration-200 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'>
					<div className='border-t px-4 py-4'>
						<div className='grid gap-4 sm:grid-cols-2'>
							<div className='space-y-4'>
								<div>
									<h4 className='mb-1 text-xs font-medium uppercase text-muted-foreground'>
										Summary
									</h4>
									<p className='text-sm'>{insight.summary}</p>
								</div>

								{insight.productIdea && (
									<div className='rounded-md bg-primary/5 p-3'>
										<div className='mb-1 flex items-center gap-1 text-xs font-medium text-primary'>
											<IconBulb className='size-3' />
											Product Idea
										</div>
										<p className='text-sm'>{insight.productIdea}</p>
									</div>
								)}

								{scrapeResult.title && (
									<div>
										<h4 className='mb-1 text-xs font-medium uppercase text-muted-foreground'>
											Original Title
										</h4>
										<p className='text-sm text-muted-foreground'>
											{scrapeResult.title}
										</p>
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

							<div className='space-y-4'>
								{opportunityLabel && (
									<div>
										<h4 className='mb-1 text-xs font-medium uppercase text-muted-foreground'>
											Opportunity Type
										</h4>
										<Badge className={opportunityColor || ''}>
											{opportunityLabel}
										</Badge>
									</div>
								)}

								{insight.targetCustomer && (
									<div>
										<h4 className='mb-1 text-xs font-medium uppercase text-muted-foreground'>
											Target Customer
										</h4>
										<p className='text-sm'>{insight.targetCustomer}</p>
									</div>
								)}

								{insight.competitorsMentioned &&
									insight.competitorsMentioned.length > 0 && (
										<div>
											<h4 className='mb-1 text-xs font-medium uppercase text-muted-foreground'>
												Competitors Mentioned
											</h4>
											<p className='text-sm'>
												{insight.competitorsMentioned.join(', ')}
											</p>
										</div>
									)}

								{insight.marketSignal !== null && (
									<div>
										<h4 className='mb-1 text-xs font-medium uppercase text-muted-foreground'>
											Market Signal
										</h4>
										<div className='flex items-center gap-2'>
											<div className='h-2 flex-1 overflow-hidden rounded-full bg-muted'>
												<div
													className='h-full bg-primary transition-all'
													style={{
														width: `${Math.round(insight.marketSignal * 100)}%`,
													}}
												/>
											</div>
											<span className='text-xs font-medium tabular-nums'>
												{Math.round(insight.marketSignal * 100)}%
											</span>
										</div>
									</div>
								)}

								{scrapeResult.url && (
									<div>
										<a
											href={scrapeResult.url}
											target='_blank'
											rel='noopener noreferrer'
											className='inline-flex items-center gap-1 text-sm text-primary hover:underline'
										>
											View original source
											<IconExternalLink className='size-3' />
										</a>
									</div>
								)}
							</div>
						</div>
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
};

export default InsightRow;
