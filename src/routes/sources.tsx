import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
	IconBrandReddit,
	IconDatabase,
	IconNews,
	IconPlus,
	IconRocket,
	IconToggleLeft,
	IconToggleRight,
	IconTrash,
} from '@tabler/icons-react';
import type { Source, SourceConfig } from '@/db';
import type { SourceType } from '@/lib/ui-constants';
import {
	createSource,
	deleteSource,
	getSources,
	toggleSource,
} from '@/server/sources';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
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
import TabNavigation from '@/components/tab-navigation';
import { SOURCE_TYPE_ICONS, SOURCE_TYPE_LABELS } from '@/lib/ui-constants';

export const Route = createFileRoute('/sources')({ component: SourcesPage });

function SourcesPage() {
	const queryClient = useQueryClient();
	const [isCreating, setIsCreating] = useState(false);

	const { data: sources = [], isLoading } = useQuery({
		queryKey: ['sources'],
		queryFn: () => getSources(),
	});

	const createMutation = useMutation({
		mutationFn: (data: CreateSourceData) => createSource({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sources'] });
			setIsCreating(false);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (data: { id: string }) => deleteSource({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sources'] });
		},
	});

	const toggleMutation = useMutation({
		mutationFn: (data: { id: string }) => toggleSource({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sources'] });
		},
	});

	const enabledCount = sources.filter((s) => s.enabled).length;

	return (
		<main className='mx-auto max-w-6xl px-4 py-6'>
			<TabNavigation />

			<div className='mt-6 space-y-6'>
				{/* Page Header */}
				<div className='flex items-center justify-between'>
					<div>
						<h2 className='text-2xl font-bold'>Sources</h2>
						<p className='text-sm text-muted-foreground'>
							{sources.length} sources · {enabledCount} enabled
						</p>
					</div>
					<Button
						onClick={() => setIsCreating(true)}
						className='cursor-pointer'
					>
						<IconPlus className='size-4' />
						Add Source
					</Button>
				</div>

				{/* Create Form (Collapsible) */}
				<Collapsible open={isCreating} onOpenChange={setIsCreating}>
					<CollapsibleContent>
						<CreateSourceForm
							onCancel={() => setIsCreating(false)}
							onSubmit={(data) => createMutation.mutate(data)}
							isSubmitting={createMutation.isPending}
						/>
					</CollapsibleContent>
				</Collapsible>

				{/* Sources List */}
				{isLoading ? (
					<div className='py-8 text-center text-muted-foreground'>
						Loading sources...
					</div>
				) : sources.length === 0 ? (
					<div className='rounded-lg border border-dashed p-8 text-center'>
						<IconDatabase className='mx-auto size-10 text-muted-foreground/50' />
						<p className='mt-3 text-sm text-muted-foreground'>
							No sources configured yet. Add a source to start scraping.
						</p>
					</div>
				) : (
					<div className='space-y-2'>
						{sources.map((source) => (
							<SourceCard
								key={source.id}
								source={source}
								onToggle={() => toggleMutation.mutate({ id: source.id })}
								onDelete={() => deleteMutation.mutate({ id: source.id })}
								isToggling={toggleMutation.isPending}
								isDeleting={deleteMutation.isPending}
							/>
						))}
					</div>
				)}
			</div>
		</main>
	);
}

const SourceCard = ({
	source,
	onToggle,
	onDelete,
	isToggling,
	isDeleting,
}: {
	source: Source;
	onToggle: () => void;
	onDelete: () => void;
	isToggling: boolean;
	isDeleting: boolean;
}) => {
	const config = source.config;
	const configDisplay = getConfigDisplay(source.type, config);
	const sourceIcon = SOURCE_TYPE_ICONS[source.type as SourceType];

	return (
		<div className='flex items-center justify-between gap-4 rounded-lg border bg-card p-4'>
			<div className='flex items-center gap-3'>
				<div className='text-muted-foreground'>{sourceIcon}</div>
				<div>
					<div className='flex items-center gap-2'>
						<span className='font-medium'>{source.name}</span>
						<Badge
							variant={source.enabled ? 'default' : 'outline'}
							className='text-xs'
						>
							{source.enabled ? 'On' : 'Off'}
						</Badge>
					</div>
					<div className='flex items-center gap-2 text-xs text-muted-foreground'>
						<span>{SOURCE_TYPE_LABELS[source.type as SourceType]}</span>
						<span>·</span>
						<span>{configDisplay}</span>
						{source.lastScrapedAt && (
							<>
								<span>·</span>
								<span>
									Last: {new Date(source.lastScrapedAt).toLocaleDateString()}
								</span>
							</>
						)}
					</div>
				</div>
			</div>
			<div className='flex items-center gap-1'>
				<Button
					variant='ghost'
					size='icon-sm'
					onClick={onToggle}
					disabled={isToggling}
					title={source.enabled ? 'Disable source' : 'Enable source'}
					className='cursor-pointer'
				>
					{source.enabled ? (
						<IconToggleRight className='size-5 text-primary' />
					) : (
						<IconToggleLeft className='size-5' />
					)}
				</Button>
				<AlertDialog>
					<AlertDialogTrigger>
						<Button
							variant='ghost'
							size='icon-sm'
							className='cursor-pointer text-destructive hover:text-destructive'
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
		</div>
	);
};

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

type CreateSourceData = {
	type: SourceType;
	name: string;
	config: Record<string, unknown>;
	enabled?: boolean;
};

const CreateSourceForm = ({
	onCancel,
	onSubmit,
	isSubmitting,
}: {
	onCancel: () => void;
	onSubmit: (data: CreateSourceData) => void;
	isSubmitting: boolean;
}) => {
	const [type, setType] = useState<SourceType | ''>('');
	const [name, setName] = useState('');

	const [subreddit, setSubreddit] = useState('');

	const [includeAskHN, setIncludeAskHN] = useState(true);
	const [includeShowHN, setIncludeShowHN] = useState(true);
	const [includeJobs, setIncludeJobs] = useState(false);

	const [includeLaunches, setIncludeLaunches] = useState(true);
	const [includeDiscussions, setIncludeDiscussions] = useState(true);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!type || !name) return;

		let config: Record<string, unknown>;
		switch (type) {
			case 'reddit':
				config = { subreddit: subreddit.replace(/^r\//, '') };
				break;
			case 'hackernews':
				config = { includeAskHN, includeShowHN, includeJobs };
				break;
			case 'producthunt':
				config = { includeLaunches, includeDiscussions };
				break;
		}

		onSubmit({ type, name, config, enabled: true });
	};

	const isValid = type && name && (type !== 'reddit' || subreddit);

	return (
		<Card className='mb-6'>
			<CardHeader>
				<CardTitle>Add New Source</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className='space-y-4'>
					<div className='grid gap-4 sm:grid-cols-2'>
						<div className='space-y-2'>
							<Label htmlFor='type'>Source Type</Label>
							<Select
								value={type}
								onValueChange={(val) => setType(val as SourceType)}
							>
								<SelectTrigger className='w-full'>
									<SelectValue>
										{type ? SOURCE_TYPE_LABELS[type] : 'Select a type'}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='reddit'>
										<IconBrandReddit className='size-4' />
										Reddit
									</SelectItem>
									<SelectItem value='hackernews'>
										<IconNews className='size-4' />
										Hacker News
									</SelectItem>
									<SelectItem value='producthunt'>
										<IconRocket className='size-4' />
										Product Hunt
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='name'>Display Name</Label>
							<Input
								id='name'
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder='e.g., SaaS subreddit'
							/>
						</div>
					</div>

					{type === 'reddit' && (
						<div className='space-y-2'>
							<Label htmlFor='subreddit'>Subreddit</Label>
							<Input
								id='subreddit'
								value={subreddit}
								onChange={(e) => setSubreddit(e.target.value)}
								placeholder='e.g., saas or r/saas'
							/>
						</div>
					)}

					{type === 'hackernews' && (
						<div className='space-y-2'>
							<Label>Include Post Types</Label>
							<div className='flex flex-wrap gap-4'>
								<label className='flex items-center gap-2'>
									<input
										type='checkbox'
										checked={includeAskHN}
										onChange={(e) => setIncludeAskHN(e.target.checked)}
										className='rounded'
									/>
									<span className='text-sm'>Ask HN</span>
								</label>
								<label className='flex items-center gap-2'>
									<input
										type='checkbox'
										checked={includeShowHN}
										onChange={(e) => setIncludeShowHN(e.target.checked)}
										className='rounded'
									/>
									<span className='text-sm'>Show HN</span>
								</label>
								<label className='flex items-center gap-2'>
									<input
										type='checkbox'
										checked={includeJobs}
										onChange={(e) => setIncludeJobs(e.target.checked)}
										className='rounded'
									/>
									<span className='text-sm'>Jobs</span>
								</label>
							</div>
						</div>
					)}

					{type === 'producthunt' && (
						<div className='space-y-2'>
							<Label>Include Post Types</Label>
							<div className='flex flex-wrap gap-4'>
								<label className='flex items-center gap-2'>
									<input
										type='checkbox'
										checked={includeLaunches}
										onChange={(e) => setIncludeLaunches(e.target.checked)}
										className='rounded'
									/>
									<span className='text-sm'>Launches</span>
								</label>
								<label className='flex items-center gap-2'>
									<input
										type='checkbox'
										checked={includeDiscussions}
										onChange={(e) => setIncludeDiscussions(e.target.checked)}
										className='rounded'
									/>
									<span className='text-sm'>Discussions</span>
								</label>
							</div>
						</div>
					)}

					<div className='flex justify-end gap-2'>
						<Button type='button' variant='outline' onClick={onCancel}>
							Cancel
						</Button>
						<Button type='submit' disabled={!isValid || isSubmitting}>
							{isSubmitting ? 'Creating...' : 'Create Source'}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
};
