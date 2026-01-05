import { IconLoader2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ActionCardProps {
	title: string;
	description: string;
	icon: React.ReactNode;
	actionLabel: string;
	onAction: () => void;
	isPending: boolean;
	isDisabled?: boolean;
	pendingLabel?: string;
	variant?: 'default' | 'secondary';
	statusBadge?: React.ReactNode;
	secondaryAction?: React.ReactNode;
	result?: React.ReactNode;
}

const ActionCard = ({
	title,
	description,
	icon,
	actionLabel,
	onAction,
	isPending,
	isDisabled = false,
	pendingLabel,
	variant = 'default',
	statusBadge,
	secondaryAction,
	result,
}: ActionCardProps) => {
	return (
		<div
			className={cn(
				'relative flex flex-col rounded-lg border p-5',
				variant === 'default' && 'bg-card',
				variant === 'secondary' && 'bg-muted/30',
			)}
		>
			{statusBadge && (
				<div className='absolute right-4 top-4'>{statusBadge}</div>
			)}

			<div className='mb-4 flex items-start gap-3'>
				<div className='min-w-0'>
					<h3 className='font-semibold'>{title}</h3>
					<p className='text-sm text-muted-foreground'>{description}</p>
				</div>
			</div>

			<div className='mt-auto flex flex-wrap items-center gap-2'>
				<Button
					onClick={onAction}
					disabled={isPending || isDisabled}
					variant={variant === 'default' ? 'default' : 'secondary'}
					className='cursor-pointer'
				>
					{isPending ? (
						<>
							<IconLoader2 className='size-4 animate-spin' />
							{pendingLabel || actionLabel}
						</>
					) : (
						<>
							{icon}
							{actionLabel}
						</>
					)}
				</Button>
				{secondaryAction}
			</div>

			{result && (
				<div className='mt-3 text-sm text-muted-foreground'>{result}</div>
			)}
		</div>
	);
};

export default ActionCard;
