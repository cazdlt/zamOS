<script lang="ts">
	interface StatData {
		label: string;
		value: number;
		total?: number;
		unit: string;
		icon: string;
		color: string;
	}

	let stats = $state<StatData[]>([
		{
			label: 'CPU Usage',
			value: 45,
			unit: '%',
			icon: '⚡',
			color: 'from-blue-500 to-cyan-500'
		},
		{
			label: 'RAM',
			value: 12.4,
			total: 32,
			unit: 'GB',
			icon: '🧠',
			color: 'from-purple-500 to-pink-500'
		},
		{
			label: 'Disk',
			value: 842,
			total: 2000,
			unit: 'GB',
			icon: '💾',
			color: 'from-cyan-500 to-blue-500'
		},
		{
			label: 'Temperature',
			value: 52,
			unit: '°C',
			icon: '🌡️',
			color: 'from-orange-500 to-red-500'
		}
	]);

	// Simulate real-time updates
	$effect(() => {
		const interval = setInterval(() => {
			stats = stats.map((stat) => {
				if (stat.label === 'CPU Usage') {
					return { ...stat, value: Math.floor(Math.random() * 40) + 30 };
				}
				if (stat.label === 'RAM') {
					return { ...stat, value: parseFloat((Math.random() * 4 + 10).toFixed(1)) };
				}
				if (stat.label === 'Temperature') {
					return { ...stat, value: Math.floor(Math.random() * 10) + 48 };
				}
				return stat;
			});
		}, 2000);

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

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
	{#each stats as stat}
		<div class="glass rounded-2xl p-6 transition-all duration-300 glass-hover">
			<div class="flex items-center gap-3 mb-4">
				<span class="text-2xl">{stat.icon}</span>
				<span class="text-sm font-medium text-gray-400 uppercase tracking-wider">
					{stat.label}
				</span>
			</div>
			<div class="mb-4">
				<span class="text-3xl font-bold text-white tabular-nums">
					{stat.value}{stat.unit}
				</span>
				{#if stat.total}
					<span class="text-xl text-gray-600 font-normal ml-1">
						/ {stat.total}{stat.unit}
					</span>
				{/if}
			</div>
			<div class="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
				<div
					class="h-full transition-all duration-500 rounded-full {getStatusColor(
						getPercentage(stat)
					)}"
					style="width: {getPercentage(stat)}%"
				></div>
			</div>
			<div class="text-sm text-gray-500 text-right tabular-nums">
				{getPercentage(stat).toFixed(1)}%
			</div>
		</div>
	{/each}
</div>
