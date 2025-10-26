/**
 * Check if temperature sensors are available
 * Temperature often doesn't work in Docker without special privileges
 */
export async function canReadTemperature(): Promise<boolean> {
	try {
		const si = await import('systeminformation');
		const temp = await si.cpuTemperature();
		return temp.main > 0 || (temp.cores && temp.cores.length > 0);
	} catch {
		return false;
	}
}

/**
 * Get system uptime in human-readable format
 */
export function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);

	return parts.join(' ') || '0m';
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format network speed to Mbps or Kbps
 */
export function formatSpeed(bytesPerSec: number): { value: number; unit: string } {
	const mbps = (bytesPerSec * 8) / (1024 * 1024);

	if (mbps >= 1) {
		return {
			value: Math.round(mbps * 100) / 100,
			unit: 'Mbps'
		};
	}

	const kbps = (bytesPerSec * 8) / 1024;
	return {
		value: Math.round(kbps * 100) / 100,
		unit: 'Kbps'
	};
}
