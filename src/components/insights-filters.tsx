import { IconFilter, IconX } from '@tabler/icons-react';
import type { InsightCategory, OpportunityType } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
	CATEGORY_FILTER_OPTIONS,
	OPPORTUNITY_TYPE_FILTER_OPTIONS,
} from '@/lib/ui-constants';

interface InsightsFiltersProps {
	category: InsightCategory | undefined;
	opportunityType: OpportunityType | undefined;
	minConfidence: number;
	onCategoryChange: (value: InsightCategory | undefined) => void;
	onOpportunityTypeChange: (value: OpportunityType | undefined) => void;
	onConfidenceChange: (value: number) => void;
	onClearFilters: () => void;
}

const fromSelectValue = <T extends string>(value: string | null) =>
	value === 'all' || value === null ? undefined : (value as T);

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

			<Select
				value={category ?? 'all'}
				onValueChange={(value) =>
					onCategoryChange(fromSelectValue<InsightCategory>(value))
				}
			>
				<SelectTrigger className='w-40'>
					<SelectValue>
						{
							CATEGORY_FILTER_OPTIONS.find(
								(c) => c.value === (category ?? 'all'),
							)?.label
						}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{CATEGORY_FILTER_OPTIONS.map((cat) => (
						<SelectItem key={cat.value} value={cat.value}>
							{cat.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select
				value={opportunityType ?? 'all'}
				onValueChange={(value) =>
					onOpportunityTypeChange(fromSelectValue<OpportunityType>(value))
				}
			>
				<SelectTrigger className='w-40'>
					<SelectValue>
						{
							OPPORTUNITY_TYPE_FILTER_OPTIONS.find(
								(o) => o.value === (opportunityType ?? 'all'),
							)?.label
						}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{OPPORTUNITY_TYPE_FILTER_OPTIONS.map((opp) => (
						<SelectItem key={opp.value} value={opp.value}>
							{opp.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

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
