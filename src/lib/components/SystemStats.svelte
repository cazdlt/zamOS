<script lang="ts">
	interface StatData {
		label: string;
		value: number;
		total?: number;
		unit: string;
		icon: string;
		color: string;
	}

	interface SystemMetrics {
		cpu: number;
		ramUsed: number;
		ramTotal: number;
		diskUsed: number;
		diskTotal: number;
		timestamp: number;
	}

	let stats = $state<StatData[]>([
		{
			label: 'CPU Usage',
			value: 0,
			unit: '%',
			icon: '⚡',
			color: 'from-blue-500 to-cyan-500'
		},
		{
			label: 'RAM',
			value: 0,
			total: 0,
			unit: 'GB',
			icon: '🧠',
			color: 'from-purple-500 to-pink-500'
		},
		{
			label: 'Disk',
			value: 0,
			total: 0,
			unit: 'GB',
			icon: '💾',
			color: 'from-cyan-500 to-blue-500'
		}
	]);

	async function fetchMetrics() {
		try {
			const response = await fetch('/api/metrics/system');
			if (response.ok) {
				const data: SystemMetrics = await response.json();
				stats = stats.map((stat) => {
					if (stat.label === 'CPU Usage') {
						return { ...stat, value: data.cpu };
					}
					if (stat.label === 'RAM') {
						return { ...stat, value: data.ramUsed, total: data.ramTotal };
					}
					if (stat.label === 'Disk') {
						return { ...stat, value: data.diskUsed, total: data.diskTotal };
					}
					return stat;
				});
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
		if (stat.total) {
			return (stat.value / stat.total) * 100;
		}
		return stat.value;
	}

	function getStatusColor(percentage: number): string {
		if (percentage < 50) return 'bg-green-500';
		if (percentage < 80) return 'bg-yellow-500';
		return 'bg-red-500';
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
	{#each stats as stat (stat.label)}
		<div class="glass rounded-xl p-4 transition-all duration-300 glass-hover">
			<div class="flex items-center gap-2 mb-3">
				<span class="text-xl">{stat.icon}</span>
				<span class="text-xs font-medium text-gray-400 uppercase tracking-wider">
					{stat.label}
				</span>
			</div>
			<div class="mb-3">
				<span class="text-2xl font-bold text-white tabular-nums">
					{stat.value}{stat.unit}
				</span>
				{#if stat.total}
					<span class="text-lg text-gray-600 font-normal ml-1">
						/ {stat.total}{stat.unit}
					</span>
				{/if}
			</div>
			<div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
				<div
					class="h-full transition-all duration-500 rounded-full {getStatusColor(
						getPercentage(stat)
					)}"
					style="width: {getPercentage(stat)}%"
				></div>
			</div>
			<div class="text-xs text-gray-500 text-right tabular-nums">
				{getPercentage(stat).toFixed(1)}%
			</div>
		</div>
	{/each}
</div>
