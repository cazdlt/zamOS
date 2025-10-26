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

	// Check if icon is a URL
	function isIconUrl(icon: string): boolean {
		return icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/');
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'online':
				return 'bg-green-500';
			case 'offline':
				return 'bg-red-500';
			case 'checking':
				return 'bg-yellow-500';
			default:
				return 'bg-gray-500';
		}
	}

	function getStatusTextColor(status: string): string {
		switch (status) {
			case 'online':
				return 'text-green-400';
			case 'offline':
				return 'text-red-400';
			case 'checking':
				return 'text-yellow-400';
			default:
				return 'text-gray-400';
		}
	}

	function getStatusLabel(status: string): string {
		switch (status) {
			case 'online':
				return responseTime > 0 ? `Online (${responseTime}ms)` : 'Online';
			case 'offline':
				return 'Offline';
			case 'checking':
				return 'Checking...';
			default:
				return 'Unknown';
		}
	}
</script>

<div
	class="glass rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 glass-hover group relative"
>
	<!-- Action buttons -->
	<div
		class="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
	>
		{#if onEdit}
			<button
				onclick={(e) => {
					e.stopPropagation();
					onEdit(app);
				}}
				class="p-1.5 bg-blue-500/80 hover:bg-blue-500 rounded-lg text-white transition-colors"
				aria-label="Edit"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
					/>
				</svg>
			</button>
		{/if}
		{#if onDelete && app.id}
			<button
				onclick={(e) => {
					e.stopPropagation();
					if (confirm(`Delete ${app.name}?`)) {
						onDelete(app.id!);
					}
				}}
				class="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-white transition-colors"
				aria-label="Delete"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
			</button>
		{/if}
	</div>

	<!-- App content - clickable -->
	<button
		onclick={() => window.open(app.url, '_blank', 'noopener,noreferrer')}
		class="flex flex-col gap-4 text-left w-full bg-transparent border-none p-0 cursor-pointer"
	>
		<div class="text-center mb-2 group-hover:scale-110 transition-transform duration-300">
			{#if isIconUrl(app.icon)}
				<img src={app.icon} alt={app.name} class="w-16 h-16 mx-auto object-contain" />
			{:else}
				<span class="text-5xl">{app.icon}</span>
			{/if}
		</div>
		<div class="flex-1 text-center">
			<h3 class="m-0 mb-2 text-xl font-semibold text-white">
				{app.name}
			</h3>
			<p class="m-0 text-sm text-gray-400">
				{app.description}
			</p>
		</div>
		<div class="flex items-center justify-center gap-2 pt-3 border-t border-white/10">
			<span
				class="w-2 h-2 rounded-full {getStatusColor(currentStatus)} {currentStatus === 'checking'
					? 'animate-pulse'
					: ''}"
			></span>
			<span
				class="text-xs font-medium uppercase tracking-wider {getStatusTextColor(currentStatus)}"
			>
				{getStatusLabel(currentStatus)}
			</span>
		</div>
	</button>
</div>
