import { createFileRoute } from '@tanstack/react-router';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({ component: App });

function App() {
	return (
		<div className='flex flex-col items-center justify-center h-screen'>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button>Hello</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>
						<h1>Hello World</h1>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
