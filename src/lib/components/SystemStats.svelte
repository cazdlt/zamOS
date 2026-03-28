<script lang="ts">
	interface StatData {
		label: string;
		value: number;
		total?: number;
		unit: string;
		icon: string;
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
			label: 'CPU',
			value: 0,
			unit: '%',
			icon: '▓▓'
		},
		{
			label: 'RAM',
			value: 0,
			total: 0,
			unit: 'MB',
			icon: '◈◈'
		},
		{
			label: 'DSK',
			value: 0,
			total: 0,
			unit: 'GB',
			icon: '◉◉'
		}
	]);

	async function fetchMetrics() {
		try {
			const response = await fetch('/api/metrics/system');
			if (response.ok) {
				const data: SystemMetrics = await response.json();
				stats = stats.map((stat) => {
					if (stat.label === 'CPU') {
						return { ...stat, value: Math.round(data.cpu) };
					}
					if (stat.label === 'RAM') {
						return { ...stat, value: Math.round(data.ramUsed), total: Math.round(data.ramTotal) };
					}
					if (stat.label === 'DSK') {
						return { ...stat, value: Math.round(data.diskUsed), total: Math.round(data.diskTotal) };
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
		if (stat.total && stat.total > 0) {
			return (stat.value / stat.total) * 100;
		}
		return Math.min(stat.value, 100);
	}

	function getStatusColor(percentage: number): string {
		if (percentage < 50) return 'var(--nes-lime)';
		if (percentage < 80) return 'var(--nes-yellow)';
		return 'var(--nes-red)';
	}

	function formatValue(value: number): string {
		return value.toString().padStart(3, ' ');
	}
</script>

<div class="card-mac p-0 overflow-hidden">
	<!-- Window Title Bar -->
	<div class="window-title flex items-center justify-between">
		<span class="font-system">System Status Monitor</span>
		<div class="w-2 h-2 bg-nes-lime animate-pulse-pixel"></div>
	</div>

	<!-- Stats Grid - Mac Style -->
	<div class="p-4 bg-mac-dark dither-mac">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
			{#each stats as stat (stat.label)}
				<div class="card-mac-inset p-3">
					<!-- Header with Icon -->
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-2">
							<span class="font-system text-[10px] text-nes-cyan">{stat.icon}</span>
							<span class="font-system text-mac-primary">{stat.label}</span>
						</div>
						<div class="font-terminal text-sm">
							<span class="text-nes-cyan phosphor-glow">{formatValue(stat.value)}</span>
							<span class="text-mac-muted">{stat.unit}</span>
							{#if stat.total}
								<span class="text-mac-muted">/{formatValue(stat.total)}</span>
							{/if}
						</div>
					</div>

					<!-- Progress Bar - Mac Style -->
					<div class="progress-mac progress-mac-sm">
						<div
							class="progress-mac-fill h-full transition-all duration-300"
							style="width: {getPercentage(
								stat
							)}%; background: linear-gradient(180deg, {getStatusColor(
								getPercentage(stat)
							)} 0%, var(--nes-teal) 100%)"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
