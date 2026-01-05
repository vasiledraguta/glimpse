import { cn } from '@/lib/utils';

interface StatsCardProps {
	label: string;
	value: string | number;
	icon?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}

const StatsCard = ({
	label,
	value,
	icon,
	action,
	className,
}: StatsCardProps) => {
	return (
		<div
			className={cn(
				'flex items-center justify-between rounded-lg border bg-card p-4',
				className,
			)}
		>
			<div className='flex items-center gap-3'>
				{icon && (
					<div className='flex size-10 items-center justify-center rounded-md bg-muted'>
						{icon}
					</div>
				)}
				<div>
					<p className='text-sm text-muted-foreground'>{label}</p>
					<p className='text-2xl font-bold tabular-nums'>{value}</p>
				</div>
			</div>
			{action && <div>{action}</div>}
		</div>
	);
};

export default StatsCard;
