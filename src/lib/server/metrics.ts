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

export interface DiskMetric {
	fs: string;
	mount: string;
	name: string;
	used: number;
	total: number;
	unit: 'GB' | 'TB';
	usePercent: number;
	rawUsedBytes: number;
	rawTotalBytes: number;
}

export interface RamMetric {
	used: number;
	total: number;
	unit: 'GB' | 'MB' | 'TB';
	percent: number;
	rawUsedBytes: number;
	rawTotalBytes: number;
}

export interface SystemMetrics {
	cpu: number;
	ram: RamMetric;
	ramUsed: number;
	ramTotal: number;
	diskUsed: number;
	diskTotal: number;
	disks: DiskMetric[];
	timestamp: number;
}

export function parseDisks(
	rawDisks: import('systeminformation').Systeminformation.FsSizeData[]
): DiskMetric[] {
	if (!Array.isArray(rawDisks) || rawDisks.length === 0) {
		return [];
	}

	const hasHostRoot = rawDisks.some((d) => d.mount === '/host');

	const filtered = rawDisks.filter((d) => {
		if (!d.size || d.size <= 0) return false;
		const mount = d.mount;
		const type = (d.type || '').toLowerCase();
		const fs = (d.fs || '').toLowerCase();

		if (['tmpfs', 'devtmpfs', 'squashfs', 'iso9660', 'overlayfs'].includes(type)) return false;
		if (fs.startsWith('tmpfs') || fs.startsWith('devtmpfs')) return false;

		// When /host is mounted, ignore the container's overlay /
		if (hasHostRoot && mount === '/' && type === 'overlay') return false;

		if (
			mount.startsWith('/boot') ||
			mount.startsWith('/efi') ||
			mount.startsWith('/sys') ||
			mount.startsWith('/proc') ||
			mount.startsWith('/dev')
		) {
			return false;
		}

		if (
			mount === '/etc/hosts' ||
			mount === '/etc/resolv.conf' ||
			mount === '/etc/hostname' ||
			mount === '/app' ||
			mount === '/data'
		) {
			return false;
		}

		if (mount.startsWith('/System/Volumes') && mount !== '/System/Volumes/Data') {
			return false;
		}

		return true;
	});

	const disks: DiskMetric[] = [];
	const seenMounts = new Set<string>();
	const seenFs = new Set<string>();

	const createMetric = (
		d: import('systeminformation').Systeminformation.FsSizeData,
		mountPath: string,
		displayName: string
	): DiskMetric => {
		const rawTotal = d.size;
		const rawUsed = d.used;
		const isTB = rawTotal >= 1000 * 1024 * 1024 * 1024;
		const divisor = isTB ? 1024 ** 4 : 1024 ** 3;
		const unit: 'GB' | 'TB' = isTB ? 'TB' : 'GB';
		const total = parseFloat((rawTotal / divisor).toFixed(1));
		const used = parseFloat((rawUsed / divisor).toFixed(1));
		const usePercent =
			rawTotal > 0 ? Math.min(100, Math.max(0, Math.round((rawUsed / rawTotal) * 100))) : 0;

		return {
			fs: d.fs,
			mount: mountPath,
			name: displayName,
			used,
			total,
			unit,
			usePercent,
			rawUsedBytes: rawUsed,
			rawTotalBytes: rawTotal
		};
	};

	// 1. Primary/Root OS disk
	const rootEntry =
		filtered.find((d) => d.mount === '/host') || filtered.find((d) => d.mount === '/');
	if (rootEntry) {
		disks.push(createMetric(rootEntry, '/', 'ROOT'));
		seenMounts.add('/');
		seenMounts.add('/host');
		if (rootEntry.fs) seenFs.add(rootEntry.fs);
	}

	// 2. Disks mounted under /mnt/ or /host/mnt/
	for (const d of filtered) {
		if (d === rootEntry) continue;

		let normMount = d.mount;
		if (normMount.startsWith('/host/mnt/')) {
			normMount = normMount.replace('/host/mnt/', '/mnt/');
		} else if (normMount === '/host/mnt') {
			normMount = '/mnt';
		}

		const isMnt = normMount.startsWith('/mnt');
		const isOtherValid = !normMount.startsWith('/System/Volumes') && normMount !== '/';

		if (!isMnt && !isOtherValid) continue;
		if (seenMounts.has(normMount)) continue;
		if (d.fs && seenFs.has(d.fs) && seenMounts.has(normMount)) continue;

		let name = normMount;
		if (normMount.startsWith('/mnt/')) {
			name = normMount.slice(5);
		} else if (normMount.startsWith('/Volumes/')) {
			name = normMount.slice(9);
		} else if (normMount.startsWith('/')) {
			name = normMount.slice(1);
		}
		if (!name) name = 'DISK';

		disks.push(createMetric(d, normMount, name));
		seenMounts.add(normMount);
		if (d.fs) seenFs.add(d.fs);
	}

	return disks;
}

let lastCpuUsage = 0;

export async function getSystemMetrics(): Promise<SystemMetrics> {
	const si = await import('systeminformation');

	let cpuUsage = lastCpuUsage;
	try {
		const cpuLoad = await si.currentLoad();
		const currentVal = Math.round(cpuLoad.currentLoad);
		if (!isNaN(currentVal)) {
			cpuUsage = currentVal;
			lastCpuUsage = currentVal;
		}
	} catch {
		// Keep previous or fallback value
	}

	const mem = await si.mem();
	const totalMemBytes = mem.total;
	// In Linux, MemAvailable represents the actual memory available for allocation.
	// Active RAM usage = total - available.
	const availableMemBytes =
		mem.available > 0 ? mem.available : Math.max(0, mem.free + (mem.buffcache || 0));
	const usedMemBytes = Math.max(0, totalMemBytes - availableMemBytes);

	const isRamTB = totalMemBytes >= 1000 * 1024 * 1024 * 1024;
	const isRamGB = totalMemBytes >= 1000 * 1024 * 1024;
	const ramDivisor = isRamTB ? 1024 ** 4 : isRamGB ? 1024 ** 3 : 1024 ** 2;
	const ramUnit = isRamTB ? 'TB' : isRamGB ? 'GB' : 'MB';

	const ramTotalFormatted = parseFloat((totalMemBytes / ramDivisor).toFixed(1));
	const ramUsedFormatted = parseFloat((usedMemBytes / ramDivisor).toFixed(1));
	const ramPercent =
		totalMemBytes > 0
			? Math.min(100, Math.max(0, Math.round((usedMemBytes / totalMemBytes) * 100)))
			: 0;

	const rawFs = await si.fsSize();
	const disks = parseDisks(rawFs);

	const primaryDisk = disks[0];

	return {
		cpu: cpuUsage,
		ram: {
			used: ramUsedFormatted,
			total: ramTotalFormatted,
			unit: ramUnit,
			percent: ramPercent,
			rawUsedBytes: usedMemBytes,
			rawTotalBytes: totalMemBytes
		},
		ramUsed: ramUsedFormatted,
		ramTotal: ramTotalFormatted,
		diskUsed: primaryDisk ? primaryDisk.used : 0,
		diskTotal: primaryDisk ? primaryDisk.total : 0,
		disks,
		timestamp: Date.now()
	};
}
