import { createRouter } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';

import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60,
			refetchOnWindowFocus: false,
		},
	},
});

export const getRouter = () => {
	const router = createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		context: {
			queryClient,
		},
	});

	return router;
};
