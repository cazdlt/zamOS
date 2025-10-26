<script lang="ts">
	interface NetworkData {
		label: string;
		value: number;
		unit: string;
		icon: string;
		color: string;
	}

	interface NetworkMetrics {
		downloadSpeed: number;
		uploadSpeed: number;
		timestamp: number;
	}

	let networkStats = $state<NetworkData[]>([
		{
			label: 'Download',
			value: 0,
			unit: 'Mbps',
			icon: '⬇️',
			color: 'from-green-400 to-emerald-600'
		},
		{
			label: 'Upload',
			value: 0,
			unit: 'Mbps',
			icon: '⬆️',
			color: 'from-blue-400 to-blue-600'
		}
	]);

	async function fetchNetworkMetrics() {
		try {
			const response = await fetch('/api/metrics/network');
			if (response.ok) {
				const data: NetworkMetrics = await response.json();
				networkStats = networkStats.map((stat) => {
					if (stat.label === 'Download') {
						return { ...stat, value: data.downloadSpeed };
					}
					if (stat.label === 'Upload') {
						return { ...stat, value: data.uploadSpeed };
					}
					return stat;
				});
			}
		} catch (error) {
			console.error('Failed to fetch network metrics:', error);
		}
	}

	// Fetch metrics on mount and every 1.5 seconds
	$effect(() => {
		fetchNetworkMetrics();
		const interval = setInterval(fetchNetworkMetrics, 1500);
		return () => clearInterval(interval);
	});
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
	{#each networkStats as stat (stat.label)}
		<div
			class="glass rounded-xl p-4 transition-all duration-300 glass-hover relative overflow-hidden"
		>
			<div class="flex items-center gap-2 mb-3">
				<span class="text-xl">{stat.icon}</span>
				<span class="text-xs font-medium text-gray-400 uppercase tracking-wider">
					{stat.label}
				</span>
			</div>
			<div class="mb-2">
				<span
					class="text-2xl font-bold bg-gradient-to-r {stat.color} bg-clip-text text-transparent tabular-nums"
				>
					{stat.value}
				</span>
				<span class="text-sm text-gray-500 font-normal ml-1">
					{stat.unit}
				</span>
			</div>
			<div
				class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r {stat.color} opacity-30 animate-pulse-glow"
			></div>
		</div>
	{/each}
</div>
