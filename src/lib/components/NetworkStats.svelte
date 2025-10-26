<script lang="ts">
	interface NetworkData {
		label: string;
		value: number;
		unit: string;
		icon: string;
		color: string;
	}

	let networkStats = $state<NetworkData[]>([
		{
			label: 'Download',
			value: 45.2,
			unit: 'Mbps',
			icon: '⬇️',
			color: 'from-green-400 to-emerald-600'
		},
		{
			label: 'Upload',
			value: 12.8,
			unit: 'Mbps',
			icon: '⬆️',
			color: 'from-blue-400 to-blue-600'
		},
		{
			label: 'Total Downloaded',
			value: 156.4,
			unit: 'GB',
			icon: '📥',
			color: 'from-purple-400 to-purple-600'
		},
		{
			label: 'Total Uploaded',
			value: 42.7,
			unit: 'GB',
			icon: '📤',
			color: 'from-amber-400 to-orange-600'
		}
	]);

	// Simulate real-time network activity
	$effect(() => {
		const interval = setInterval(() => {
			networkStats = networkStats.map((stat) => {
				if (stat.label === 'Download') {
					return { ...stat, value: parseFloat((Math.random() * 50 + 20).toFixed(1)) };
				}
				if (stat.label === 'Upload') {
					return { ...stat, value: parseFloat((Math.random() * 20 + 5).toFixed(1)) };
				}
				if (stat.label === 'Total Downloaded') {
					return { ...stat, value: parseFloat((stat.value + Math.random() * 0.5).toFixed(1)) };
				}
				if (stat.label === 'Total Uploaded') {
					return { ...stat, value: parseFloat((stat.value + Math.random() * 0.2).toFixed(1)) };
				}
				return stat;
			});
		}, 1500);

		return () => clearInterval(interval);
	});
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
	{#each networkStats as stat}
		<div
			class="glass rounded-2xl p-6 transition-all duration-300 glass-hover relative overflow-hidden"
		>
			<div class="flex items-center gap-3 mb-4">
				<span class="text-2xl">{stat.icon}</span>
				<span class="text-sm font-medium text-gray-400 uppercase tracking-wider">
					{stat.label}
				</span>
			</div>
			<div class="mb-2">
				<span
					class="text-3xl font-bold bg-gradient-to-r {stat.color} bg-clip-text text-transparent tabular-nums"
				>
					{stat.value}
				</span>
				<span class="text-base text-gray-500 font-normal ml-1">
					{stat.unit}
				</span>
			</div>
			<div
				class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r {stat.color} opacity-30 animate-pulse-glow"
			></div>
		</div>
	{/each}
</div>
