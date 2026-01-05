import { IconFilter, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { CATEGORIES, OPPORTUNITY_TYPES } from '@/lib/ui-constants';

interface InsightsFiltersProps {
	category: string | undefined;
	opportunityType: string | undefined;
	minConfidence: number;
	onCategoryChange: (value: string | undefined) => void;
	onOpportunityTypeChange: (value: string | undefined) => void;
	onConfidenceChange: (value: number) => void;
	onClearFilters: () => void;
}

const InsightsFilters = ({
	category,
	opportunityType,
	minConfidence,
	onCategoryChange,
	onOpportunityTypeChange,
	onConfidenceChange,
	onClearFilters,
}: InsightsFiltersProps) => {
	const hasActiveFilters =
		category !== undefined ||
		opportunityType !== undefined ||
		minConfidence > 0;

	return (
		<div className='flex flex-wrap items-center gap-3'>
			<div className='flex items-center gap-2 text-muted-foreground'>
				<IconFilter className='size-4' />
				<span className='text-sm font-medium'>Filters</span>
			</div>

			{/* Category Filter */}
			<Select
				value={category || 'all'}
				onValueChange={(value) =>
					onCategoryChange(
						value === 'all' || value === null ? undefined : value,
					)
				}
			>
				<SelectTrigger className='w-40'>
					<SelectValue>
						{category
							? CATEGORIES.find((c) => c.value === category)?.label
							: 'All Categories'}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{CATEGORIES.map((cat) => (
						<SelectItem key={cat.value} value={cat.value}>
							{cat.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Opportunity Type Filter */}
			<Select
				value={opportunityType || 'all'}
				onValueChange={(value) =>
					onOpportunityTypeChange(
						value === 'all' || value === null ? undefined : value,
					)
				}
			>
				<SelectTrigger className='w-40'>
					<SelectValue>
						{opportunityType
							? OPPORTUNITY_TYPES.find((o) => o.value === opportunityType)
									?.label
							: 'All Opportunities'}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{OPPORTUNITY_TYPES.map((opp) => (
						<SelectItem key={opp.value} value={opp.value}>
							{opp.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Confidence Slider */}
			<div className='flex items-center gap-2'>
				<span className='text-xs text-muted-foreground'>Min confidence:</span>
				<Slider
					value={[minConfidence]}
					onValueChange={(value) => {
						const val = Array.isArray(value) ? value[0] : value;
						onConfidenceChange(val);
					}}
					min={0}
					max={100}
					step={5}
					className='w-24'
				/>
				<span className='w-8 text-xs font-medium tabular-nums'>
					{minConfidence}%
				</span>
			</div>

			{/* Clear Filters */}
			{hasActiveFilters && (
				<Button
					variant='ghost'
					size='sm'
					onClick={onClearFilters}
					className='cursor-pointer text-muted-foreground'
				>
					<IconX className='size-3' />
					Clear
				</Button>
			)}
		</div>
	);
};

export default InsightsFilters;
