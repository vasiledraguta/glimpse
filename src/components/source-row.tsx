import {
	IconToggleLeft,
	IconToggleRight,
	IconTrash,
} from '@tabler/icons-react';
import type { Source, SourceConfig } from '@/db';
import type { SourceType } from '@/lib/ui-constants';
import { SOURCE_TYPE_ICONS, SOURCE_TYPE_LABELS } from '@/lib/ui-constants';
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

interface SourceRowProps {
	source: Source;
	onToggle: () => void;
	onDelete: () => void;
	isToggling: boolean;
	isDeleting: boolean;
}

const getConfigDisplay = (type: string, config: SourceConfig): string => {
	switch (type) {
		case 'reddit':
			return `Subreddit: r/${(config as { subreddit: string }).subreddit}`;
		case 'hackernews': {
			const hnConfig = config as {
				includeAskHN: boolean;
				includeShowHN: boolean;
				includeJobs: boolean;
			};
			const types = [];
			if (hnConfig.includeAskHN) types.push('Ask HN');
			if (hnConfig.includeShowHN) types.push('Show HN');
			if (hnConfig.includeJobs) types.push('Jobs');
			return types.length > 0 ? `Types: ${types.join(', ')}` : 'All types';
		}
		case 'producthunt': {
			const phConfig = config as {
				includeLaunches: boolean;
				includeDiscussions: boolean;
			};
			const types = [];
			if (phConfig.includeLaunches) types.push('Launches');
			if (phConfig.includeDiscussions) types.push('Discussions');
			return types.length > 0 ? `Types: ${types.join(', ')}` : 'All types';
		}
		default:
			return JSON.stringify(config);
	}
};

const SourceRow = ({
	source,
	onToggle,
	onDelete,
	isToggling,
	isDeleting,
}: SourceRowProps) => {
	const config = source.config;
	const configDisplay = getConfigDisplay(source.type, config);
	const sourceIcon = SOURCE_TYPE_ICONS[source.type as SourceType];
	const sourceLabel = SOURCE_TYPE_LABELS[source.type as SourceType];

	const formattedDate = source.lastScrapedAt
		? new Date(source.lastScrapedAt).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			})
		: null;

	return (
		<div className='grid w-full grid-cols-[auto_1fr_8rem_1fr_6rem_auto_auto] items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50'>
			{/* Icon */}
			<div className='shrink-0 text-muted-foreground'>{sourceIcon}</div>

			{/* Name */}
			<span className='min-w-0 truncate font-medium'>{source.name}</span>

			{/* Source Type */}
			<span className='shrink-0 text-sm text-muted-foreground'>
				{sourceLabel}
			</span>

			{/* Config Display */}
			<span className='min-w-0 truncate text-sm text-muted-foreground'>
				{configDisplay}
			</span>

			{/* Last Scraped Date */}
			{formattedDate ? (
				<span className='shrink-0 text-xs text-muted-foreground'>
					Last: {formattedDate}
				</span>
			) : (
				<span className='shrink-0 text-xs text-muted-foreground'>—</span>
			)}

			{/* Toggle Button */}
			<Button
				variant='ghost'
				size='icon-sm'
				onClick={onToggle}
				disabled={isToggling}
				title={source.enabled ? 'Disable source' : 'Enable source'}
				className='shrink-0 cursor-pointer'
			>
				{source.enabled ? (
					<IconToggleRight className='size-5 text-primary' />
				) : (
					<IconToggleLeft className='size-5' />
				)}
			</Button>

			{/* Delete Button */}
			<AlertDialog>
				<AlertDialogTrigger>
					<Button
						variant='ghost'
						size='icon-sm'
						className='shrink-0 cursor-pointer text-destructive hover:text-destructive'
					>
						<IconTrash className='size-4' />
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Source</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete &quot;{source.name}&quot;? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={onDelete}
							disabled={isDeleting}
							className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default SourceRow;
