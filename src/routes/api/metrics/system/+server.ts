import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as si from 'systeminformation';

// Configure systeminformation to read from host system in Docker
si.setConfigDir('/host/proc', '/host/sys');

export const GET: RequestHandler = async () => {
	try {
		// Gather system metrics in parallel
		const [cpuLoad, mem, fsSize] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize()]);

		// Calculate disk usage for primary filesystem
		const mainDisk =
			fsSize.find((disk) => disk.mount === '/' || disk.mount === '/app') || fsSize[0];

		// Convert bytes to GB
		const ramUsedGB = mem.used / (1024 * 1024 * 1024);
		const ramTotalGB = mem.total / (1024 * 1024 * 1024);
		const diskUsedGB = mainDisk ? mainDisk.used / (1024 * 1024 * 1024) : 0;
		const diskTotalGB = mainDisk ? mainDisk.size / (1024 * 1024 * 1024) : 0;

		return json({
			cpu: Math.round(cpuLoad.currentLoad),
			ramUsed: parseFloat(ramUsedGB.toFixed(1)),
			ramTotal: parseFloat(ramTotalGB.toFixed(1)),
			diskUsed: parseFloat(diskUsedGB.toFixed(0)),
			diskTotal: parseFloat(diskTotalGB.toFixed(0)),
			timestamp: Date.now()
		});
	} catch (error) {
		console.error('Error fetching system metrics:', error);
		return json(
			{
				error: 'Failed to fetch system metrics',
				cpu: 0,
				ramUsed: 0,
				ramTotal: 0,
				diskUsed: 0,
				diskTotal: 0,
				timestamp: Date.now()
			},
			{ status: 500 }
		);
	}
};
