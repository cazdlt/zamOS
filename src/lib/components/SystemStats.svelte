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

	interface Props {
		initialMetrics?: SystemMetricsResponse | null;
	}

	let { initialMetrics = null }: Props = $props();

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

	function applyMetrics(data: SystemMetricsResponse) {
		// 1. CPU
		cpuVal = Math.round(data.cpu ?? 0);
		if (Array.isArray(data.cpuHistory) && data.cpuHistory.length > 0) {
			cpuHistory = data.cpuHistory;
		} else if (cpuHistory.length === 0) {
			cpuHistory = [cpuVal];
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
		} else if (ramHistory.length === 0) {
			ramHistory = [ramPercent];
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

	$effect.pre(() => {
		if (initialMetrics) {
			applyMetrics(initialMetrics);
		}
	});

	async function fetchMetrics() {
		try {
			const response = await fetch('/api/metrics/system');
			if (response.ok) {
				const data: SystemMetricsResponse = await response.json();
				applyMetrics(data);
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

	interface SparklineData {
		linePath: string;
		areaPath: string;
		lastPoint: { x: number; y: number } | null;
	}

	function generateSparkline(history: number[], width = 200, height = 56): SparklineData {
		if (!history || history.length === 0) {
			return { linePath: '', areaPath: '', lastPoint: null };
		}

		const padding = 3;
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

		return { linePath, areaPath, lastPoint: last };
	}

	let cpuSpark = $derived(generateSparkline(cpuHistory, 200, 56));
	let ramSpark = $derived(generateSparkline(ramHistory, 200, 56));

	let cpuAvg = $derived(
		cpuHistory.length > 0
			? Math.round(cpuHistory.reduce((a, b) => a + b, 0) / cpuHistory.length)
			: cpuVal
	);
	let cpuMax = $derived(cpuHistory.length > 0 ? Math.max(...cpuHistory) : cpuVal);

	let ramFree = $derived(Math.max(0, parseFloat((ramVal.total - ramVal.used).toFixed(1))));

	function getStatusColor(percentage: number): string {
		if (percentage < 60) return 'var(--nes-lime)';
		if (percentage < 85) return 'var(--nes-yellow)';
		return 'var(--nes-red)';
	}

	function formatValue(value: number): string {
		return Number.isInteger(value) ? value.toString() : value.toFixed(1);
	}
</script>

<div class="card-mac p-0 overflow-hidden">
	<!-- Window Title Bar -->
	<div class="window-title flex items-center justify-between px-3 py-1.5 sm:py-2">
		<div class="flex items-center gap-2">
			<span class="font-system text-[9px] sm:text-xs">SYSTEM TELEMETRY MONITOR</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="font-terminal text-[11px] sm:text-xs text-mac-muted">LIVE · 2s POLLING</span>
			<div class="w-2 h-2 bg-nes-lime animate-pulse-pixel"></div>
		</div>
	</div>

	<!-- Stats Content - Mac Style -->
	<div class="p-3 sm:p-4 bg-mac-dark dither-mac flex flex-col gap-3">
		{#if disks.length <= 2}
			<!-- Unified Harmonious Grid when 1 or 2 Disks -->
			<div
				class="grid gap-3 {disks.length === 1
					? 'grid-cols-1 md:grid-cols-3'
					: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'}"
			>
				<!-- CPU Card -->
				<div
					class="card-mac-inset p-3 sm:p-3.5 flex flex-col justify-between h-[152px] sm:h-[158px]"
				>
					<!-- Header -->
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-1.5 sm:gap-2">
							<span class="font-system text-[9px] sm:text-[10px] text-nes-cyan shrink-0">▓▓</span>
							<span class="font-system text-[10px] sm:text-xs text-mac-primary tracking-wide"
								>CPU</span
							>
						</div>
						<div class="flex items-baseline gap-1">
							<span
								class="font-terminal text-2xl sm:text-3xl font-bold text-nes-cyan phosphor-glow leading-none"
							>
								{cpuVal}%
							</span>
						</div>
					</div>

					<!-- Oscilloscope Display -->
					<div
						class="h-14 sm:h-16 w-full bg-mac-deep border border-mac-platinum-dark relative overflow-hidden"
					>
						<svg class="w-full h-full block" viewBox="0 0 200 56" preserveAspectRatio="none">
							<defs>
								<linearGradient id="cpu-grad" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="var(--nes-cyan)" stop-opacity="0.4" />
									<stop offset="100%" stop-color="var(--nes-cyan)" stop-opacity="0.02" />
								</linearGradient>
							</defs>
							<!-- CRT Guidelines: 25%, 50%, 75% -->
							<line
								x1="0"
								y1="42"
								x2="200"
								y2="42"
								stroke="var(--mac-platinum-dark)"
								stroke-dasharray="2 3"
								stroke-width="0.5"
							/>
							<line
								x1="0"
								y1="28"
								x2="200"
								y2="28"
								stroke="var(--mac-platinum-dark)"
								stroke-dasharray="3 3"
								stroke-width="0.75"
							/>
							<line
								x1="0"
								y1="14"
								x2="200"
								y2="14"
								stroke="var(--mac-platinum-dark)"
								stroke-dasharray="2 3"
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
									stroke-width="1.75"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							{/if}
							{#if cpuSpark.lastPoint}
								<circle
									cx={cpuSpark.lastPoint.x}
									cy={cpuSpark.lastPoint.y}
									r="2.5"
									fill="var(--nes-cyan)"
								/>
							{/if}
						</svg>
						<span
							class="absolute bottom-0.5 right-1 text-[8px] font-terminal text-mac-dim pointer-events-none select-none"
						>
							60s
						</span>
					</div>

					<!-- Telemetry Footer -->
					<div
						class="font-terminal text-xs text-mac-secondary flex items-center justify-between border-t border-mac-platinum-dark pt-1"
					>
						<span>AVG {cpuAvg}%</span>
						<span class="text-mac-platinum-light">·</span>
						<span>PEAK {cpuMax}%</span>
						<span class="text-mac-platinum-light">·</span>
						<span class="text-mac-muted">60s WINDOW</span>
					</div>
				</div>

				<!-- RAM Card -->
				<div
					class="card-mac-inset p-3 sm:p-3.5 flex flex-col justify-between h-[152px] sm:h-[158px]"
				>
					<!-- Header -->
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-1.5 sm:gap-2">
							<span class="font-system text-[9px] sm:text-[10px] text-nes-teal shrink-0">◈◈</span>
							<span class="font-system text-[10px] sm:text-xs text-mac-primary tracking-wide"
								>RAM</span
							>
						</div>
						<div class="flex items-baseline gap-1">
							<span
								class="font-terminal text-2xl sm:text-3xl font-bold text-nes-teal phosphor-glow leading-none"
							>
								{ramVal.percent}%
							</span>
						</div>
					</div>

					<!-- Oscilloscope Display -->
					<div
						class="h-14 sm:h-16 w-full bg-mac-deep border border-mac-platinum-dark relative overflow-hidden"
					>
						<svg class="w-full h-full block" viewBox="0 0 200 56" preserveAspectRatio="none">
							<defs>
								<linearGradient id="ram-grad" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="var(--nes-teal)" stop-opacity="0.4" />
									<stop offset="100%" stop-color="var(--nes-teal)" stop-opacity="0.02" />
								</linearGradient>
							</defs>
							<!-- CRT Guidelines: 25%, 50%, 75% -->
							<line
								x1="0"
								y1="42"
								x2="200"
								y2="42"
								stroke="var(--mac-platinum-dark)"
								stroke-dasharray="2 3"
								stroke-width="0.5"
							/>
							<line
								x1="0"
								y1="28"
								x2="200"
								y2="28"
								stroke="var(--mac-platinum-dark)"
								stroke-dasharray="3 3"
								stroke-width="0.75"
							/>
							<line
								x1="0"
								y1="14"
								x2="200"
								y2="14"
								stroke="var(--mac-platinum-dark)"
								stroke-dasharray="2 3"
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
									stroke-width="1.75"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							{/if}
							{#if ramSpark.lastPoint}
								<circle
									cx={ramSpark.lastPoint.x}
									cy={ramSpark.lastPoint.y}
									r="2.5"
									fill="var(--nes-teal)"
								/>
							{/if}
						</svg>
						<span
							class="absolute bottom-0.5 right-1 text-[8px] font-terminal text-mac-dim pointer-events-none select-none"
						>
							60s
						</span>
					</div>

					<!-- Telemetry Footer -->
					<div
						class="font-terminal text-xs text-mac-secondary flex items-center justify-between border-t border-mac-platinum-dark pt-1"
					>
						<span>USED {formatValue(ramVal.used)}{ramVal.unit}</span>
						<span class="text-mac-platinum-light">·</span>
						<span>FREE {formatValue(ramFree)}{ramVal.unit}</span>
						<span class="text-mac-platinum-light">·</span>
						<span class="text-mac-muted">{formatValue(ramVal.total)}{ramVal.unit}</span>
					</div>
				</div>

				<!-- Storage Cards (1 or 2) -->
				{#each disks as disk, idx (disk.mount + idx)}
					{@const free = Math.max(0, parseFloat((disk.total - disk.used).toFixed(1)))}
					{@const statusColor = getStatusColor(disk.usePercent)}
					<div
						class="card-mac-inset p-3 sm:p-3.5 flex flex-col justify-between h-[152px] sm:h-[158px]"
					>
						<!-- Header -->
						<div class="flex items-center justify-between gap-1 min-w-0">
							<div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
								<span
									class="font-system text-[9px] sm:text-[10px] shrink-0"
									style="color: {statusColor};">◉◉</span
								>
								<span
									class="font-system text-[10px] sm:text-xs text-mac-primary tracking-wide truncate"
									title="{disk.name} ({disk.mount})"
								>
									{disk.mount === '/' ? 'ROOT DISK' : disk.name}
								</span>
							</div>
							<div class="flex items-baseline gap-1 shrink-0">
								<span
									class="font-terminal text-2xl sm:text-3xl font-bold phosphor-glow leading-none"
									style="color: {statusColor};"
								>
									{disk.usePercent}%
								</span>
							</div>
						</div>

						<!-- Storage Meter Bay -->
						<div
							class="h-14 sm:h-16 w-full flex flex-col justify-center gap-1.5 bg-mac-deep border border-mac-platinum-dark p-2 relative"
						>
							<!-- Mount & Status Line -->
							<div
								class="flex items-center justify-between text-[11px] font-terminal text-mac-muted"
							>
								<span class="text-mac-primary font-mono truncate max-w-[130px]">{disk.mount}</span>
								<span>{disk.usePercent < 85 ? 'NORMAL' : 'CAPACITY WARN'}</span>
							</div>

							<!-- Segmented CRT Bar -->
							<div
								class="h-4 w-full bg-mac-dark border border-mac-platinum-dark relative overflow-hidden"
							>
								<div
									class="h-full transition-all duration-300 relative"
									style="width: {disk.usePercent}%; background: linear-gradient(90deg, var(--mac-bg-light) 0%, {statusColor} 100%);"
								>
									<!-- Pixel Segment Pattern -->
									<div
										class="absolute inset-0 opacity-30"
										style="background-image: repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.85) 3px, rgba(0,0,0,0.85) 4px);"
									></div>
								</div>
								<!-- 25%, 50%, 75% Grid Markers -->
								<div
									class="absolute top-0 bottom-0 left-1/4 w-px bg-mac-platinum-dark/60 pointer-events-none"
								></div>
								<div
									class="absolute top-0 bottom-0 left-1/2 w-px bg-mac-platinum-dark/80 pointer-events-none"
								></div>
								<div
									class="absolute top-0 bottom-0 left-3/4 w-px bg-mac-platinum-dark/60 pointer-events-none"
								></div>
							</div>
						</div>

						<!-- Telemetry Footer -->
						<div
							class="font-terminal text-xs text-mac-secondary flex items-center justify-between border-t border-mac-platinum-dark pt-1"
						>
							<span>USED {formatValue(disk.used)}{disk.unit}</span>
							<span class="text-mac-platinum-light">·</span>
							<span>FREE {formatValue(free)}{disk.unit}</span>
							<span class="text-mac-platinum-light">·</span>
							<span class="text-mac-muted">{formatValue(disk.total)}{disk.unit}</span>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Layout for 3+ Disks: CPU/RAM Top Row + Disks Rack Below -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<!-- CPU Card -->
				<div
					class="card-mac-inset p-3 sm:p-3.5 flex flex-col justify-between h-[152px] sm:h-[158px]"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-1.5 sm:gap-2">
							<span class="font-system text-[9px] sm:text-[10px] text-nes-cyan shrink-0">▓▓</span>
							<span class="font-system text-[10px] sm:text-xs text-mac-primary tracking-wide"
								>CPU</span
							>
						</div>
						<div class="flex items-baseline gap-1">
							<span
								class="font-terminal text-2xl sm:text-3xl font-bold text-nes-cyan phosphor-glow leading-none"
							>
								{cpuVal}%
							</span>
						</div>
					</div>

					<div
						class="h-14 sm:h-16 w-full bg-mac-deep border border-mac-platinum-dark relative overflow-hidden"
					>
						<svg class="w-full h-full block" viewBox="0 0 200 56" preserveAspectRatio="none">
							<defs>
								<linearGradient id="cpu-grad-alt" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="var(--nes-cyan)" stop-opacity="0.4" />
									<stop offset="100%" stop-color="var(--nes-cyan)" stop-opacity="0.02" />
								</linearGradient>
							</defs>
							<line
								x1="0"
								y1="42"
								x2="200"
								y2="42"
								stroke="var(--mac-platinum-dark)"
								stroke-dasharray="2 3"
								stroke-width="0.5"
							/>
							<line
								x1="0"
								y1="28"
								x2="200"
								y2="28"
								stroke="var(--mac-platinum-dark)"
								stroke-dasharray="3 3"
								stroke-width="0.75"
							/>
							<line
								x1="0"
								y1="14"
								x2="200"
								y2="14"
								stroke="var(--mac-platinum-dark)"
								stroke-dasharray="2 3"
								stroke-width="0.5"
							/>

							{#if cpuSpark.areaPath}
								<path d={cpuSpark.areaPath} fill="url(#cpu-grad-alt)" />
							{/if}
							{#if cpuSpark.linePath}
								<path
									d={cpuSpark.linePath}
									fill="none"
									stroke="var(--nes-cyan)"
									stroke-width="1.75"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							{/if}
							{#if cpuSpark.lastPoint}
								<circle
									cx={cpuSpark.lastPoint.x}
									cy={cpuSpark.lastPoint.y}
									r="2.5"
									fill="var(--nes-cyan)"
								/>
							{/if}
						</svg>
						<span
							class="absolute bottom-0.5 right-1 text-[8px] font-terminal text-mac-dim pointer-events-none select-none"
						>
							60s
						</span>
					</div>

					<div
						class="font-terminal text-xs text-mac-secondary flex items-center justify-between border-t border-mac-platinum-dark pt-1"
					>
						<span>AVG {cpuAvg}%</span>
						<span class="text-mac-platinum-light">·</span>
						<span>PEAK {cpuMax}%</span>
						<span class="text-mac-platinum-light">·</span>
						<span class="text-mac-muted">60s WINDOW</span>
					</div>
				</div>

				<!-- RAM Card -->
				<div
					class="card-mac-inset p-3 sm:p-3.5 flex flex-col justify-between h-[152px] sm:h-[158px]"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-1.5 sm:gap-2">
							<span class="font-system text-[9px] sm:text-[10px] text-nes-teal shrink-0">◈◈</span>
							<span class="font-system text-[10px] sm:text-xs text-mac-primary tracking-wide"
								>RAM</span
							>
						</div>
						<div class="flex items-baseline gap-1">
							<span
								class="font-terminal text-2xl sm:text-3xl font-bold text-nes-teal phosphor-glow leading-none"
							>
								{ramVal.percent}%
							</span>
						</div>
					</div>

					<div
						class="h-14 sm:h-16 w-full bg-mac-deep border border-mac-platinum-dark relative overflow-hidden"
					>
						<svg class="w-full h-full block" viewBox="0 0 200 56" preserveAspectRatio="none">
							<defs>
								<linearGradient id="ram-grad-alt" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="var(--nes-teal)" stop-opacity="0.4" />
									<stop offset="100%" stop-color="var(--nes-teal)" stop-opacity="0.02" />
								</linearGradient>
							</defs>
							<line
								x1="0"
								y1="42"
								x2="200"
								y2="42"
								stroke="var(--mac-platinum-dark)"
								stroke-dasharray="2 3"
								stroke-width="0.5"
							/>
							<line
								x1="0"
								y1="28"
								x2="200"
								y2="28"
								stroke="var(--mac-platinum-dark)"
								stroke-dasharray="3 3"
								stroke-width="0.75"
							/>
							<line
								x1="0"
								y1="14"
								x2="200"
								y2="14"
								stroke="var(--mac-platinum-dark)"
								stroke-dasharray="2 3"
								stroke-width="0.5"
							/>

							{#if ramSpark.areaPath}
								<path d={ramSpark.areaPath} fill="url(#ram-grad-alt)" />
							{/if}
							{#if ramSpark.linePath}
								<path
									d={ramSpark.linePath}
									fill="none"
									stroke="var(--nes-teal)"
									stroke-width="1.75"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							{/if}
							{#if ramSpark.lastPoint}
								<circle
									cx={ramSpark.lastPoint.x}
									cy={ramSpark.lastPoint.y}
									r="2.5"
									fill="var(--nes-teal)"
								/>
							{/if}
						</svg>
						<span
							class="absolute bottom-0.5 right-1 text-[8px] font-terminal text-mac-dim pointer-events-none select-none"
						>
							60s
						</span>
					</div>

					<div
						class="font-terminal text-xs text-mac-secondary flex items-center justify-between border-t border-mac-platinum-dark pt-1"
					>
						<span>USED {formatValue(ramVal.used)}{ramVal.unit}</span>
						<span class="text-mac-platinum-light">·</span>
						<span>FREE {formatValue(ramFree)}{ramVal.unit}</span>
						<span class="text-mac-platinum-light">·</span>
						<span class="text-mac-muted">{formatValue(ramVal.total)}{ramVal.unit}</span>
					</div>
				</div>
			</div>

			<!-- Disks Sub-Section -->
			<div class="pt-2 border-t border-mac-platinum-dark flex flex-col gap-2.5">
				<div class="flex items-center gap-1.5">
					<span class="font-system text-[8px] sm:text-[9px] text-nes-yellow">◉◉</span>
					<span class="font-system text-[9px] sm:text-[10px] text-mac-primary tracking-wide">
						STORAGE ARRAYS ({disks.length})
					</span>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
					{#each disks as disk, idx (disk.mount + idx)}
						{@const free = Math.max(0, parseFloat((disk.total - disk.used).toFixed(1)))}
						{@const statusColor = getStatusColor(disk.usePercent)}
						<div
							class="card-mac-inset p-3 sm:p-3.5 flex flex-col justify-between h-[152px] sm:h-[158px]"
						>
							<div class="flex items-center justify-between gap-1 min-w-0">
								<div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
									<span
										class="font-system text-[9px] sm:text-[10px] shrink-0"
										style="color: {statusColor};">◉◉</span
									>
									<span
										class="font-system text-[10px] sm:text-xs text-mac-primary tracking-wide truncate"
										title="{disk.name} ({disk.mount})"
									>
										{disk.mount === '/' ? 'ROOT DISK' : disk.name}
									</span>
								</div>
								<div class="flex items-baseline gap-1 shrink-0">
									<span
										class="font-terminal text-2xl sm:text-3xl font-bold phosphor-glow leading-none"
										style="color: {statusColor};"
									>
										{disk.usePercent}%
									</span>
								</div>
							</div>

							<div
								class="h-14 sm:h-16 w-full flex flex-col justify-center gap-1.5 bg-mac-deep border border-mac-platinum-dark p-2 relative"
							>
								<div
									class="flex items-center justify-between text-[11px] font-terminal text-mac-muted"
								>
									<span class="text-mac-primary font-mono truncate max-w-[130px]">{disk.mount}</span
									>
									<span>{disk.usePercent < 85 ? 'NORMAL' : 'CAPACITY WARN'}</span>
								</div>

								<div
									class="h-4 w-full bg-mac-dark border border-mac-platinum-dark relative overflow-hidden"
								>
									<div
										class="h-full transition-all duration-300 relative"
										style="width: {disk.usePercent}%; background: linear-gradient(90deg, var(--mac-bg-light) 0%, {statusColor} 100%);"
									>
										<div
											class="absolute inset-0 opacity-30"
											style="background-image: repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.85) 3px, rgba(0,0,0,0.85) 4px);"
										></div>
									</div>
									<div
										class="absolute top-0 bottom-0 left-1/4 w-px bg-mac-platinum-dark/60 pointer-events-none"
									></div>
									<div
										class="absolute top-0 bottom-0 left-1/2 w-px bg-mac-platinum-dark/80 pointer-events-none"
									></div>
									<div
										class="absolute top-0 bottom-0 left-3/4 w-px bg-mac-platinum-dark/60 pointer-events-none"
									></div>
								</div>
							</div>

							<div
								class="font-terminal text-xs text-mac-secondary flex items-center justify-between border-t border-mac-platinum-dark pt-1"
							>
								<span>USED {formatValue(disk.used)}{disk.unit}</span>
								<span class="text-mac-platinum-light">·</span>
								<span>FREE {formatValue(free)}{disk.unit}</span>
								<span class="text-mac-platinum-light">·</span>
								<span class="text-mac-muted">{formatValue(disk.total)}{disk.unit}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
