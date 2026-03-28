<script lang="ts">
	interface App {
		id?: number;
		name: string;
		description: string;
		icon: string;
		url: string;
		status: 'running' | 'stopped' | 'error';
	}

	interface AppStatus {
		url: string;
		status: 'online' | 'offline' | 'checking';
		responseTime: number;
	}

	interface Props {
		app: App;
		appStatuses: Record<string, AppStatus>;
		onEdit?: (app: App) => void;
		onDelete?: (id: number) => void;
	}

	let { app, appStatuses, onEdit, onDelete }: Props = $props();

	let currentStatus = $derived.by(() => {
		return appStatuses[app.url]?.status ?? 'checking';
	});
	let responseTime = $derived.by(() => {
		return appStatuses[app.url]?.responseTime ?? 0;
	});

	function isIconUrl(icon: string): boolean {
		return icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/');
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'online':
				return 'var(--nes-lime)';
			case 'offline':
				return 'var(--nes-red)';
			case 'checking':
				return 'var(--nes-yellow)';
			default:
				return 'var(--text-muted)';
		}
	}

	function getStatusLabel(status: string): string {
		switch (status) {
			case 'online':
				return responseTime > 0 ? `ON [${responseTime}ms]` : 'ONLINE';
			case 'offline':
				return 'OFFLINE';
			case 'checking':
				return 'CHECK...';
			default:
				return '???';
		}
	}

	function truncateName(name: string): string {
		if (name.length > 12) {
			return name.substring(0, 11) + '..';
		}
		return name.padEnd(12, ' ');
	}

	function truncateDescription(desc: string): string {
		if (desc.length > 18) {
			return desc.substring(0, 17) + '..';
		}
		return desc;
	}
</script>

<div
	class="card-mac group relative overflow-hidden cursor-pointer hover:bg-mac-medium transition-all duration-150"
>
	<!-- Inner Inset Area for Content -->
	<div class="card-mac-inset m-2 p-4 min-h-[180px] flex flex-col">
		<!-- Icon Area - NES Style -->
		<div class="flex-1 flex items-center justify-center mb-3">
			{#if isIconUrl(app.icon)}
				<div class="w-14 h-14 border-mac-inset bg-mac-deep flex items-center justify-center p-2">
					<img src={app.icon} alt={app.name} class="w-full h-full object-contain" />
				</div>
			{:else}
				<div class="text-5xl animate-pulse-pixel text-nes-cyan">{app.icon}</div>
			{/if}
		</div>

		<!-- Info Area -->
		<div class="text-center mb-3">
			<h3 class="font-system text-xs mb-1 text-mac-primary uppercase tracking-wider">
				{truncateName(app.name)}
			</h3>
			<p class="font-terminal text-mac-secondary leading-tight">
				{truncateDescription(app.description)}
			</p>
		</div>

		<!-- Status Area - NES Pixel Style -->
		<div class="border-t-2 border-mac-platinum-dark pt-3 mt-auto">
			<div class="flex items-center justify-center gap-2">
				<div
					class="status-dot {currentStatus === 'online'
						? 'status-online'
						: currentStatus === 'offline'
							? 'status-offline'
							: 'status-checking'}"
					class:animate-blink={currentStatus === 'checking'}
				></div>
				<span class="font-system text-[10px]" style="color: {getStatusColor(currentStatus)}">
					{getStatusLabel(currentStatus)}
				</span>
			</div>
		</div>
	</div>

	<!-- Action Buttons - Mac Style -->
	<div
		class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
	>
		{#if onEdit}
			<button
				onclick={(e) => {
					e.stopPropagation();
					onEdit(app);
				}}
				class="w-6 h-6 bg-mac-medium border border-mac-platinum flex items-center justify-center text-mac-secondary text-[10px] font-system hover:bg-nes-orange hover:text-mac-deep hover:border-nes-orange transition-colors"
				aria-label="Edit"
			>
				E
			</button>
		{/if}
		{#if onDelete && app.id}
			<button
				onclick={(e) => {
					e.stopPropagation();
					if (confirm(`DELETE ${app.name}?`)) {
						onDelete(app.id!);
					}
				}}
				class="w-6 h-6 bg-mac-medium border border-mac-platinum flex items-center justify-center text-mac-secondary text-[10px] font-system hover:bg-nes-red hover:text-mac-deep hover:border-nes-red transition-colors"
				aria-label="Delete"
			>
				X
			</button>
		{/if}
	</div>

	<!-- Click Handler Overlay -->
	<button
		onclick={() => window.open(app.url, '_blank', 'noopener,noreferrer')}
		class="absolute inset-0 bg-transparent border-none cursor-pointer"
		aria-label="Open {app.name}"
	></button>
</div>
