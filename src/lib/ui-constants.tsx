import { IconBrandReddit, IconNews, IconRocket } from '@tabler/icons-react';
import type { InsightCategory, OpportunityType, SourceType } from './domain';

export type { SourceType } from './domain';

export const SOURCE_TYPE_ICONS: Record<SourceType, React.ReactNode> = {
	reddit: <IconBrandReddit className='size-4' />,
	hackernews: <IconNews className='size-4' />,
	producthunt: <IconRocket className='size-4' />,
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
	reddit: 'Reddit',
	hackernews: 'Hacker News',
	producthunt: 'Product Hunt',
};

export const CATEGORY_COLORS: Record<InsightCategory, string> = {
	complaint: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
	feature_request:
		'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
	pain_point:
		'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
	idea: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
	other: 'bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300',
};

export const CATEGORY_LABELS: Record<InsightCategory, string> = {
	complaint: 'Complaint',
	feature_request: 'Feature Request',
	pain_point: 'Pain Point',
	idea: 'Idea',
	other: 'Other',
};

export const CATEGORY_FILTER_OPTIONS: Array<{
	value: InsightCategory | 'all';
	label: string;
}> = [
	{ value: 'all', label: 'All Categories' },
	{ value: 'complaint', label: 'Complaints' },
	{ value: 'feature_request', label: 'Feature Requests' },
	{ value: 'pain_point', label: 'Pain Points' },
	{ value: 'idea', label: 'Ideas' },
	{ value: 'other', label: 'Other' },
];

export const OPPORTUNITY_TYPE_COLORS: Record<OpportunityType, string> = {
	gap: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
	improvement:
		'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
	workflow: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
	pricing:
		'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
	integration:
		'bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300',
};

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
	gap: 'Market Gap',
	improvement: 'Improvement',
	workflow: 'Workflow',
	pricing: 'Pricing',
	integration: 'Integration',
};

export const OPPORTUNITY_TYPE_FILTER_OPTIONS: Array<{
	value: OpportunityType | 'all';
	label: string;
}> = [
	{ value: 'all', label: 'All Opportunities' },
	{ value: 'gap', label: 'Market Gaps' },
	{ value: 'improvement', label: 'Improvements' },
	{ value: 'workflow', label: 'Workflow' },
	{ value: 'pricing', label: 'Pricing' },
	{ value: 'integration', label: 'Integration' },
];
