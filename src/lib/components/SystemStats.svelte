<script lang="ts">
	interface StatData {
		id: string;
		label: string;
		sublabel?: string;
		fullLabel?: string;
		value: number;
		total?: number;
		unit: string;
		icon: string;
		percent?: number;
	}

	interface DiskMetric {
		fs: string;
		mount: string;
		name: string;
		used: number;
		total: number;
		unit: 'GB' | 'TB';
		usePercent: number;
	}

	interface SystemMetricsResponse {
		cpu: number;
		ram?: {
			used: number;
			total: number;
			unit: string;
			percent: number;
		};
		ramUsed: number;
		ramTotal: number;
		diskUsed: number;
		diskTotal: number;
		disks?: DiskMetric[];
		timestamp: number;
	}

	let stats = $state<StatData[]>([
		{
			id: 'cpu',
			label: 'CPU',
			value: 0,
			unit: '%',
			icon: '▓▓',
			percent: 0
		},
		{
			id: 'ram',
			label: 'RAM',
			value: 0,
			total: 0,
			unit: 'GB',
			icon: '◈◈',
			percent: 0
		},
		{
			id: 'disk-root',
			label: 'DSK /',
			sublabel: '/',
			value: 0,
			total: 0,
			unit: 'GB',
			icon: '◉◉',
			percent: 0
		}
	]);

	async function fetchMetrics() {
		try {
			const response = await fetch('/api/metrics/system');
			if (response.ok) {
				const data: SystemMetricsResponse = await response.json();
				const newStats: StatData[] = [];

				// 1. CPU
				const cpuVal = Math.round(data.cpu ?? 0);
				newStats.push({
					id: 'cpu',
					label: 'CPU',
					value: cpuVal,
					unit: '%',
					icon: '▓▓',
					percent: cpuVal
				});

				// 2. RAM
				const ramUsed = data.ram?.used ?? data.ramUsed ?? 0;
				const ramTotal = data.ram?.total ?? data.ramTotal ?? 0;
				const ramUnit = data.ram?.unit ?? 'GB';
				const ramPercent =
					data.ram?.percent ?? (ramTotal > 0 ? Math.round((ramUsed / ramTotal) * 100) : 0);

				newStats.push({
					id: 'ram',
					label: 'RAM',
					value: ramUsed,
					total: ramTotal,
					unit: ramUnit,
					icon: '◈◈',
					percent: ramPercent
				});

				// 3. Disks
				if (data.disks && data.disks.length > 0) {
					data.disks.forEach((disk, idx) => {
						const isRoot = disk.mount === '/';
						const label = isRoot ? 'DSK /' : `DSK ${disk.name}`;
						newStats.push({
							id: `disk-${disk.mount}-${idx}`,
							label,
							sublabel: disk.mount,
							fullLabel: `${disk.name} (${disk.mount})`,
							value: disk.used,
							total: disk.total,
							unit: disk.unit,
							icon: '◉◉',
							percent: disk.usePercent
						});
					});
				} else {
					const diskUsed = data.diskUsed ?? 0;
					const diskTotal = data.diskTotal ?? 0;
					const diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;
					newStats.push({
						id: 'disk-root',
						label: 'DSK /',
						sublabel: '/',
						value: diskUsed,
						total: diskTotal,
						unit: 'GB',
						icon: '◉◉',
						percent: diskPercent
					});
				}

				stats = newStats;
			}
		} catch (error) {
			console.error('Failed to fetch system metrics:', error);
		}
	}

	// Fetch metrics on mount and every 2 seconds
	$effect(() => {
		fetchMetrics();
		const interval = setInterval(fetchMetrics, 2000);
		return () => clearInterval(interval);
	});

	function getPercentage(stat: StatData): number {
		if (stat.percent !== undefined) {
			return Math.min(100, Math.max(0, stat.percent));
		}
		if (stat.total && stat.total > 0) {
			return Math.min(100, Math.max(0, (stat.value / stat.total) * 100));
		}
		return Math.min(100, Math.max(0, stat.value));
	}

	function getStatusColor(percentage: number): string {
		if (percentage < 50) return 'var(--nes-lime)';
		if (percentage < 80) return 'var(--nes-yellow)';
		return 'var(--nes-red)';
	}

	function formatValue(value: number): string {
		return Number.isInteger(value) ? value.toString() : value.toFixed(1);
	}
</script>

<div class="card-mac p-0 overflow-hidden">
	<!-- Window Title Bar -->
	<div class="window-title flex items-center justify-between px-2 sm:px-3 py-1 sm:py-2">
		<span class="font-system text-[10px] sm:text-xs">System Status Monitor</span>
		<div class="w-2 h-2 bg-nes-lime animate-pulse-pixel"></div>
	</div>

	<!-- Stats Grid - Mac Style -->
	<div class="p-2 sm:p-4 bg-mac-dark dither-mac">
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
			{#each stats as stat (stat.id)}
				<div class="card-mac-inset p-2 sm:p-3 flex flex-col justify-between">
					<!-- Header with Icon and Label -->
					<div class="flex items-center justify-between mb-1 sm:mb-2 gap-2">
						<div class="flex items-center gap-1 sm:gap-2 min-w-0">
							<span class="font-system text-[8px] sm:text-[10px] text-nes-cyan shrink-0"
								>{stat.icon}</span
							>
							<div class="flex flex-col min-w-0">
								<span
									class="font-system text-[10px] sm:text-xs text-mac-primary truncate"
									title={stat.fullLabel || stat.label}
								>
									{stat.label}
								</span>
								{#if stat.sublabel}
									<span
										class="font-terminal text-[10px] sm:text-xs text-mac-muted truncate leading-tight"
										title={stat.sublabel}
									>
										{stat.sublabel}
									</span>
								{/if}
							</div>
						</div>
						<div class="font-terminal text-xs sm:text-sm shrink-0 whitespace-nowrap">
							<span class="text-nes-cyan phosphor-glow">{formatValue(stat.value)}</span>
							<span class="text-mac-muted">{stat.unit}</span>
							{#if stat.total !== undefined}
								<span class="text-mac-muted">/{formatValue(stat.total)}</span>
							{/if}
						</div>
					</div>

					<!-- Progress Bar - Mac Style -->
					<div class="progress-mac progress-mac-sm h-3 sm:h-[14px]">
						<div
							class="progress-mac-fill h-full transition-all duration-300"
							style="width: {getPercentage(
								stat
							)}%; background: linear-gradient(180deg, {getStatusColor(
								getPercentage(stat)
							)} 0%, var(--nes-teal) 100%)"
							title="{Math.round(getPercentage(stat))}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
