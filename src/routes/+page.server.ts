import { appQueries } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const apps = appQueries.getAll();

	return {
		apps
	};
};
