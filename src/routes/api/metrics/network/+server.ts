import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as si from 'systeminformation';

// Store previous network stats for calculating deltas
let previousStats: { rx: number; tx: number; timestamp: number } | null = null;

export const GET: RequestHandler = async () => {
	try {
		// Get network stats
		const networkStats = await si.networkStats();

		// Use the first network interface (usually primary)
		const primaryInterface = networkStats[0] || { rx_sec: 0, tx_sec: 0, rx_bytes: 0, tx_bytes: 0 };

		// Get current totals
		const currentRx = primaryInterface.rx_bytes || 0;
		const currentTx = primaryInterface.tx_bytes || 0;
		const currentTime = Date.now();

		// Calculate speeds (bytes per second)
		let downloadSpeed = primaryInterface.rx_sec || 0;
		let uploadSpeed = primaryInterface.tx_sec || 0;

		// If we have previous stats, calculate delta-based speeds
		if (previousStats) {
			const timeDelta = (currentTime - previousStats.timestamp) / 1000; // seconds
			if (timeDelta > 0) {
				downloadSpeed = (currentRx - previousStats.rx) / timeDelta;
				uploadSpeed = (currentTx - previousStats.tx) / timeDelta;
			}
		}

		// Update previous stats
		previousStats = {
			rx: currentRx,
			tx: currentTx,
			timestamp: currentTime
		};

		// Convert to Mbps
		const formatSpeed = (bytesPerSec: number) => {
			const mbps = (bytesPerSec * 8) / (1024 * 1024); // Convert to Mbps
			return Math.round(mbps * 100) / 100; // Round to 2 decimals
		};

		return json({
			downloadSpeed: formatSpeed(downloadSpeed), // Mbps
			uploadSpeed: formatSpeed(uploadSpeed), // Mbps
			timestamp: currentTime
		});
	} catch (error) {
		console.error('Error fetching network metrics:', error);
		return json(
			{
				error: 'Failed to fetch network metrics',
				downloadSpeed: 0,
				uploadSpeed: 0,
				timestamp: Date.now()
			},
			{ status: 500 }
		);
	}
};
