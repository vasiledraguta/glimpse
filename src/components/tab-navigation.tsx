import { Link, useLocation } from '@tanstack/react-router';
import {
	IconBulb,
	IconDatabase,
	IconLayoutDashboard,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import ModeToggle from '@/components/mode-toggle';

const TABS = [
	{ to: '/', label: 'Dashboard', icon: IconLayoutDashboard },
	{ to: '/insights', label: 'Insights', icon: IconBulb },
	{ to: '/sources', label: 'Sources', icon: IconDatabase },
] as const;

const TabNavigation = () => {
	const location = useLocation();
	const currentPath = location.pathname;

	return (
		<nav className='flex items-center justify-between gap-1 border-b'>
			<div className='flex gap-1'>
				{TABS.map((tab) => {
					const isActive =
						tab.to === '/'
							? currentPath === '/'
							: currentPath.startsWith(tab.to);
					const Icon = tab.icon;

					return (
						<Link
							key={tab.to}
							to={tab.to}
							className={cn(
								'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
								'border-b-2 -mb-px',
								isActive
									? 'border-primary text-foreground'
									: 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
							)}
						>
							<Icon className='size-4' />
							{tab.label}
						</Link>
					);
				})}
			</div>
			<div className='px-4'>
				<ModeToggle />
			</div>
		</nav>
	);
};

export default TabNavigation;
