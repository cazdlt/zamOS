<script lang="ts">
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
		cpuHistory?: number[];
		ram?: {
			used: number;
			total: number;
			unit: string;
			percent: number;
		};
		ramHistory?: number[];
		ramUsed: number;
		ramTotal: number;
		diskUsed: number;
		diskTotal: number;
		disks?: DiskMetric[];
		timestamp: number;
	}

	let cpuVal = $state(0);
	let cpuHistory = $state<number[]>([]);

	let ramVal = $state({
		used: 0,
		total: 0,
		unit: 'GB',
		percent: 0
	});
	let ramHistory = $state<number[]>([]);

	let disks = $state<DiskMetric[]>([]);

	const MAX_HISTORY = 30;

	async function fetchMetrics() {
		try {
			const response = await fetch('/api/metrics/system');
			if (response.ok) {
				const data: SystemMetricsResponse = await response.json();

				// 1. CPU
				cpuVal = Math.round(data.cpu ?? 0);
				if (Array.isArray(data.cpuHistory) && data.cpuHistory.length > 0) {
					cpuHistory = data.cpuHistory;
				} else {
					cpuHistory = [...cpuHistory.slice(-(MAX_HISTORY - 1)), cpuVal];
				}

				// 2. RAM
				const ramUsed = data.ram?.used ?? data.ramUsed ?? 0;
				const ramTotal = data.ram?.total ?? data.ramTotal ?? 0;
				const ramUnit = data.ram?.unit ?? 'GB';
				const ramPercent =
					data.ram?.percent ?? (ramTotal > 0 ? Math.round((ramUsed / ramTotal) * 100) : 0);

				ramVal = {
					used: ramUsed,
					total: ramTotal,
					unit: ramUnit,
					percent: ramPercent
				};

				if (Array.isArray(data.ramHistory) && data.ramHistory.length > 0) {
					ramHistory = data.ramHistory;
				} else {
					ramHistory = [...ramHistory.slice(-(MAX_HISTORY - 1)), ramPercent];
				}

				// 3. Disks
				if (Array.isArray(data.disks) && data.disks.length > 0) {
					disks = data.disks;
				} else {
					const diskUsed = data.diskUsed ?? 0;
					const diskTotal = data.diskTotal ?? 0;
					const diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;
					disks = [
						{
							fs: 'root',
							mount: '/',
							name: 'ROOT',
							used: diskUsed,
							total: diskTotal,
							unit: 'GB',
							usePercent: diskPercent
						}
					];
				}
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

	function generateSparkline(
		history: number[],
		width = 100,
		height = 32
	): { linePath: string; areaPath: string } {
		if (!history || history.length === 0) {
			return { linePath: '', areaPath: '' };
		}

		const padding = 2;
		const availableHeight = height - padding * 2;
		const maxPoints = Math.max(history.length, 2);

		const points = history.map((val, idx) => {
			const x = (idx / (maxPoints - 1)) * width;
			const clamped = Math.min(100, Math.max(0, val));
			const y = height - padding - (clamped / 100) * availableHeight;
			return { x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) };
		});

		if (points.length === 1) {
			points.push({ x: width, y: points[0].y });
		}

		const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
		const first = points[0];
		const last = points[points.length - 1];
		const areaPath = `${linePath} L ${last.x} ${height} L ${first.x} ${height} Z`;

		return { linePath, areaPath };
	}

	let cpuSpark = $derived(generateSparkline(cpuHistory));
	let ramSpark = $derived(generateSparkline(ramHistory));

	let cpuAvg = $derived(
		cpuHistory.length > 0
			? Math.round(cpuHistory.reduce((a, b) => a + b, 0) / cpuHistory.length)
			: cpuVal
	);
	let cpuMax = $derived(cpuHistory.length > 0 ? Math.max(...cpuHistory) : cpuVal);

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
		<div class="flex items-center gap-2">
			<span class="font-terminal text-[10px] text-mac-muted hidden sm:inline"
				>LIVE · 2s POLLING</span
			>
			<div class="w-2 h-2 bg-nes-lime animate-pulse-pixel"></div>
		</div>
	</div>

	<!-- Stats Content - Mac Style -->
	<div class="p-2.5 sm:p-4 bg-mac-dark dither-mac flex flex-col gap-3">
		<!-- Top Row: CPU & RAM Monitors with Rolling History -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
			<!-- CPU Card -->
			<div class="card-mac-inset p-2.5 sm:p-3 flex flex-col justify-between gap-2">
				<!-- Header Info -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-1.5 sm:gap-2">
						<span class="font-system text-[8px] sm:text-[10px] text-nes-cyan shrink-0">▓▓</span>
						<span class="font-system text-[10px] sm:text-xs text-mac-primary">CPU</span>
					</div>
					<div class="font-terminal text-sm sm:text-base flex items-baseline gap-1.5">
						<span class="text-nes-cyan phosphor-glow text-base sm:text-lg font-bold">{cpuVal}%</span
						>
						{#if cpuHistory.length > 1}
							<span class="text-mac-dim text-xs hidden sm:inline">
								AVG {cpuAvg}% · MAX {cpuMax}%
							</span>
						{/if}
					</div>
				</div>

				<!-- Sparkline History Chart -->
				<div
					class="h-8 sm:h-9 w-full bg-mac-deep border border-mac-platinum-dark relative overflow-hidden"
				>
					<svg class="w-full h-full block" viewBox="0 0 100 32" preserveAspectRatio="none">
						<defs>
							<linearGradient id="cpu-grad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color="var(--nes-cyan)" stop-opacity="0.45" />
								<stop offset="100%" stop-color="var(--nes-cyan)" stop-opacity="0.05" />
							</linearGradient>
						</defs>
						<!-- 50% guideline -->
						<line
							x1="0"
							y1="16"
							x2="100"
							y2="16"
							stroke="var(--mac-platinum-dark)"
							stroke-dasharray="2 2"
							stroke-width="0.5"
						/>
						{#if cpuSpark.areaPath}
							<path d={cpuSpark.areaPath} fill="url(#cpu-grad)" />
						{/if}
						{#if cpuSpark.linePath}
							<path
								d={cpuSpark.linePath}
								fill="none"
								stroke="var(--nes-cyan)"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						{/if}
					</svg>
					<span
						class="absolute bottom-0.5 right-1 text-[8px] sm:text-[9px] font-terminal text-mac-dim pointer-events-none select-none"
					>
						LAST 60s
					</span>
				</div>
			</div>

			<!-- RAM Card -->
			<div class="card-mac-inset p-2.5 sm:p-3 flex flex-col justify-between gap-2">
				<!-- Header Info -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-1.5 sm:gap-2">
						<span class="font-system text-[8px] sm:text-[10px] text-nes-cyan shrink-0">◈◈</span>
						<span class="font-system text-[10px] sm:text-xs text-mac-primary">RAM</span>
					</div>
					<div class="font-terminal text-sm sm:text-base flex items-baseline gap-1.5">
						<span class="text-nes-cyan phosphor-glow text-base sm:text-lg font-bold"
							>{ramVal.percent}%</span
						>
						<span class="text-mac-secondary text-xs sm:text-sm">
							({formatValue(ramVal.used)}{ramVal.unit} / {formatValue(ramVal.total)}{ramVal.unit})
						</span>
					</div>
				</div>

				<!-- Sparkline History Chart -->
				<div
					class="h-8 sm:h-9 w-full bg-mac-deep border border-mac-platinum-dark relative overflow-hidden"
				>
					<svg class="w-full h-full block" viewBox="0 0 100 32" preserveAspectRatio="none">
						<defs>
							<linearGradient id="ram-grad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color="var(--nes-teal)" stop-opacity="0.45" />
								<stop offset="100%" stop-color="var(--nes-teal)" stop-opacity="0.05" />
							</linearGradient>
						</defs>
						<!-- 50% guideline -->
						<line
							x1="0"
							y1="16"
							x2="100"
							y2="16"
							stroke="var(--mac-platinum-dark)"
							stroke-dasharray="2 2"
							stroke-width="0.5"
						/>
						{#if ramSpark.areaPath}
							<path d={ramSpark.areaPath} fill="url(#ram-grad)" />
						{/if}
						{#if ramSpark.linePath}
							<path
								d={ramSpark.linePath}
								fill="none"
								stroke="var(--nes-teal)"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						{/if}
					</svg>
					<span
						class="absolute bottom-0.5 right-1 text-[8px] sm:text-[9px] font-terminal text-mac-dim pointer-events-none select-none"
					>
						LAST 60s
					</span>
				</div>
			</div>
		</div>

		<!-- Disks Section: All Disks Grouped Together -->
		{#if disks.length > 0}
			<div class="pt-2 border-t border-mac-platinum-dark flex flex-col gap-2">
				<!-- Section Sub-Header -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-1.5">
						<span class="font-system text-[8px] sm:text-[9px] text-nes-yellow">◉◉</span>
						<span class="font-system text-[9px] sm:text-[10px] text-mac-primary tracking-wide">
							STORAGE / DISKS ({disks.length})
						</span>
					</div>
				</div>

				<!-- Disks Grid -->
				<div
					class="grid grid-cols-1 sm:grid-cols-2 {disks.length > 2
						? 'lg:grid-cols-3 xl:grid-cols-4'
						: ''} gap-2 sm:gap-2.5"
				>
					{#each disks as disk, idx (disk.mount + idx)}
						<div class="card-mac-inset p-2.5 sm:p-3 flex flex-col justify-between gap-2 min-w-0">
							<!-- Disk Name and Usage Row - Single Clean Line -->
							<div class="flex items-center justify-between gap-2 min-w-0">
								<div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
									<span class="font-system text-[8px] sm:text-[10px] text-nes-cyan shrink-0">◉</span
									>
									<span
										class="font-system text-[10px] sm:text-xs text-mac-primary truncate"
										title="{disk.name} ({disk.mount})"
									>
										{disk.mount === '/' ? '/' : disk.name}
									</span>
								</div>

								<div class="font-terminal text-xs sm:text-sm text-right shrink-0 whitespace-nowrap">
									<span class="text-nes-cyan phosphor-glow">{formatValue(disk.used)}</span>
									<span class="text-mac-muted">{disk.unit}</span>
									<span class="text-mac-muted">/{formatValue(disk.total)}{disk.unit}</span>
									<span class="ml-1 text-mac-secondary">({disk.usePercent}%)</span>
								</div>
							</div>

							<!-- Progress Bar -->
							<div class="progress-mac progress-mac-sm h-3 sm:h-[14px]">
								<div
									class="progress-mac-fill h-full transition-all duration-300"
									style="width: {disk.usePercent}%; background: linear-gradient(180deg, {getStatusColor(
										disk.usePercent
									)} 0%, var(--nes-teal) 100%)"
									title="{disk.usePercent}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
