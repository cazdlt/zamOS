import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSystemMetrics } from '$lib/server/metrics';

export const GET: RequestHandler = async () => {
	try {
		const metrics = await getSystemMetrics();
		return json(metrics);
	} catch (error) {
		console.error('Error fetching system metrics:', error);
		return json(
			{
				error: 'Failed to fetch system metrics',
				cpu: 0,
				ram: {
					used: 0,
					total: 0,
					unit: 'GB',
					percent: 0,
					rawUsedBytes: 0,
					rawTotalBytes: 0
				},
				ramUsed: 0,
				ramTotal: 0,
				diskUsed: 0,
				diskTotal: 0,
				disks: [],
				timestamp: Date.now()
			},
			{ status: 500 }
		);
	}
};
