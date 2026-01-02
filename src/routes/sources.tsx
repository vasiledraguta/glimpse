import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
	IconBrandReddit,
	IconNews,
	IconPlus,
	IconRocket,
	IconToggleLeft,
	IconToggleRight,
	IconTrash,
} from '@tabler/icons-react';
import type { Source, SourceConfig } from '@/db';
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

export const Route = createFileRoute('/sources')({ component: SourcesPage });

type SourceType = 'reddit' | 'hackernews' | 'producthunt';

const SOURCE_TYPE_ICONS: Record<SourceType, React.ReactNode> = {
	reddit: <IconBrandReddit className='size-5' />,
	hackernews: <IconNews className='size-5' />,
	producthunt: <IconRocket className='size-5' />,
};

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
	reddit: 'Reddit',
	hackernews: 'Hacker News',
	producthunt: 'Product Hunt',
};

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

	return (
		<div className='min-h-screen bg-background'>
			<div className='mx-auto max-w-4xl px-4 py-8'>
				<div className='mb-8 flex items-center justify-between'>
					<div>
						<h1 className='text-2xl font-bold'>Sources</h1>
						<p className='text-muted-foreground text-sm'>
							Manage the data sources for scraping pain points
						</p>
					</div>
					<Button onClick={() => setIsCreating(true)}>
						<IconPlus data-icon='inline-start' className='size-4' />
						Add Source
					</Button>
				</div>

				{isCreating && (
					<CreateSourceForm
						onCancel={() => setIsCreating(false)}
						onSubmit={(data) => createMutation.mutate(data)}
						isSubmitting={createMutation.isPending}
					/>
				)}

				{isLoading ? (
					<div className='text-muted-foreground py-8 text-center'>
						Loading sources...
					</div>
				) : sources.length === 0 ? (
					<Card>
						<CardContent className='py-8 text-center'>
							<p className='text-muted-foreground'>
								No sources configured yet. Add a source to start scraping.
							</p>
						</CardContent>
					</Card>
				) : (
					<div className='space-y-4'>
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
		</div>
	);
}

function SourceCard({
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
}) {
	const config = source.config;
	const configDisplay = getConfigDisplay(source.type, config);

	return (
		<Card>
			<CardHeader className='flex-row items-center justify-between'>
				<div className='flex items-center gap-3'>
					<div className='text-muted-foreground'>
						{SOURCE_TYPE_ICONS[source.type as SourceType]}
					</div>
					<div>
						<CardTitle className='text-base'>{source.name}</CardTitle>
						<p className='text-muted-foreground text-sm'>
							{SOURCE_TYPE_LABELS[source.type as SourceType]}
						</p>
					</div>
				</div>
				<div className='flex items-center gap-2'>
					<Badge variant={source.enabled ? 'default' : 'secondary'}>
						{source.enabled ? 'Enabled' : 'Disabled'}
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className='flex items-center justify-between'>
					<div className='text-muted-foreground text-sm'>{configDisplay}</div>
					<div className='flex items-center gap-2'>
						<Button
							variant='ghost'
							size='icon-sm'
							onClick={onToggle}
							disabled={isToggling}
							title={source.enabled ? 'Disable source' : 'Enable source'}
						>
							{source.enabled ? (
								<IconToggleRight className='size-5' />
							) : (
								<IconToggleLeft className='size-5' />
							)}
						</Button>
						<AlertDialog>
							<AlertDialogTrigger>
								<Button variant='destructive' size='icon-sm'>
									<IconTrash className='size-4' />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete Source</AlertDialogTitle>
									<AlertDialogDescription>
										Are you sure you want to delete &quot;{source.name}&quot;?
										This action cannot be undone.
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
				{source.lastScrapedAt && (
					<p className='text-muted-foreground mt-2 text-xs'>
						Last scraped: {new Date(source.lastScrapedAt).toLocaleString()}
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function getConfigDisplay(type: string, config: SourceConfig): string {
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
}

type CreateSourceData = {
	type: SourceType;
	name: string;
	config: Record<string, unknown>;
	enabled?: boolean;
};

function CreateSourceForm({
	onCancel,
	onSubmit,
	isSubmitting,
}: {
	onCancel: () => void;
	onSubmit: (data: CreateSourceData) => void;
	isSubmitting: boolean;
}) {
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
}
