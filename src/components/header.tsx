import { Link } from '@tanstack/react-router';
import { IconBrain } from '@tabler/icons-react';

const NAV_LINKS = [
	{ to: '/', label: 'Dashboard' },
	{ to: '/insights', label: 'Insights' },
	{ to: '/sources', label: 'Sources' },
] as const;

const Header = () => {
	return (
		<header className='border-b'>
			<div className='mx-auto flex max-w-6xl items-center justify-between px-4 py-4'>
				<div className='flex items-center gap-2'>
					<IconBrain className='size-6 text-primary' />
					<h1 className='text-xl font-bold'>Glimpse</h1>
				</div>
				<nav className='flex items-center gap-4'>
					{NAV_LINKS.map((link) => (
						<Link
							key={link.to}
							to={link.to}
							activeProps={{
								className: 'text-sm font-medium text-primary',
							}}
							inactiveProps={{
								className:
									'text-sm font-medium text-muted-foreground hover:text-foreground',
							}}
						>
							{link.label}
						</Link>
					))}
				</nav>
			</div>
		</header>
	);
};

export default Header;
