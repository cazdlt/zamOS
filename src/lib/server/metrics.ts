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

function normalizeMount(mount: string): string {
	if (mount === '/host' || mount === '/host/') return '/';
	if (mount.startsWith('/host/')) return mount.slice(5);
	return mount;
}

const IGNORED_FS_TYPES = new Set([
	'tmpfs',
	'devtmpfs',
	'devpts',
	'proc',
	'sysfs',
	'overlay',
	'overlayfs',
	'squashfs',
	'iso9660',
	'cgroup',
	'cgroup2',
	'pstore',
	'bpf',
	'tracefs',
	'hugetlbfs',
	'mqueue',
	'autofs',
	'ramfs',
	'securityfs',
	'configfs',
	'debugfs',
	'fusectl',
	'binfmt_misc',
	'rpc_pipefs',
	'nfsd',
	'efivarfs',
	'fuse.gvfsd-fuse',
	'fuse.portal',
	'shm',
	'nullfs'
]);

function isSystemPath(path: string): boolean {
	const sysDirs = [
		'/boot',
		'/efi',
		'/sys',
		'/proc',
		'/dev',
		'/run',
		'/etc',
		'/var',
		'/usr',
		'/tmp',
		'/opt',
		'/snap',
		'/root',
		'/app',
		'/data'
	];
	return sysDirs.some((dir) => path === dir || path.startsWith(dir + '/'));
}

function isValidStoragePath(path: string): boolean {
	const allowedPrefixes = ['/mnt', '/media', '/storage', '/disks', '/Volumes'];
	return allowedPrefixes.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
}

function getDiskName(normMount: string): string {
	const prefixes = ['/mnt/', '/media/', '/storage/', '/disks/', '/Volumes/'];
	for (const prefix of prefixes) {
		if (normMount.startsWith(prefix)) {
			const rel = normMount.slice(prefix.length);
			const segments = rel.split('/').filter(Boolean);
			return segments[segments.length - 1] || rel;
		}
	}
	const clean = normMount.replace(/^\/+/, '');
	const segments = clean.split('/').filter(Boolean);
	return segments[segments.length - 1] || normMount || 'DISK';
}

export function parseDisks(
	rawDisks: import('systeminformation').Systeminformation.FsSizeData[]
): DiskMetric[] {
	if (!Array.isArray(rawDisks) || rawDisks.length === 0) {
		return [];
	}

	const hasHostRoot = rawDisks.some((d) => d.mount === '/host' || d.mount === '/host/');

	// Find the primary root OS disk entry
	const rootEntry = hasHostRoot
		? rawDisks.find((d) => d.mount === '/host' || d.mount === '/host/')
		: rawDisks.find((d) => d.mount === '/System/Volumes/Data') ||
			rawDisks.find((d) => d.mount === '/') ||
			rawDisks[0];

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

	const disks: DiskMetric[] = [];
	const seenMounts = new Set<string>();
	const seenFs = new Set<string>();

	if (rootEntry && rootEntry.size > 0) {
		disks.push(createMetric(rootEntry, '/', 'ROOT'));
		seenMounts.add('/');
		seenMounts.add('/host');
		seenMounts.add('/System/Volumes/Data');
		if (rootEntry.fs) seenFs.add(rootEntry.fs);
	}

	for (const d of rawDisks) {
		if (d === rootEntry) continue;
		if (!d.size || d.size <= 0) continue;

		const normMount = normalizeMount(d.mount);
		const type = (d.type || '').toLowerCase();
		const fs = (d.fs || '').toLowerCase();

		// Skip pseudo/virtual and container filesystem types
		if (IGNORED_FS_TYPES.has(type)) continue;
		if (
			fs.startsWith('tmpfs') ||
			fs.startsWith('devtmpfs') ||
			fs.startsWith('udev') ||
			fs.startsWith('overlay') ||
			fs === 'none'
		) {
			continue;
		}
		if (fs.includes('loop')) continue;

		// Skip macOS internal volumes and system directories
		if (normMount.startsWith('/System/Volumes') || normMount.startsWith('/Volumes/Macintosh HD')) {
			continue;
		}
		if (isSystemPath(normMount)) continue;

		// Only include valid dedicated storage locations
		if (!isValidStoragePath(normMount)) continue;

		// Deduplicate by mount point and physical filesystem/device
		if (seenMounts.has(normMount)) continue;
		if (d.fs && seenFs.has(d.fs)) continue;

		const name = getDiskName(normMount);
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
