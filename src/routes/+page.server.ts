import { appQueries } from '$lib/server/db';
import { getSystemMetrics } from '$lib/server/metrics';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const apps = appQueries.getAll();
	const systemMetrics = await getSystemMetrics().catch(() => null);

	return {
		apps,
		systemMetrics
	};
};
