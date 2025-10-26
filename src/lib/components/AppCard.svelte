<script lang="ts">
	interface App {
		name: string;
		description: string;
		icon: string;
		url: string;
		status: 'running' | 'stopped' | 'error';
	}

	let { app }: { app: App } = $props();

	function getStatusColor(status: string): string {
		switch (status) {
			case 'running':
				return 'bg-green-500';
			case 'stopped':
				return 'bg-gray-500';
			case 'error':
				return 'bg-red-500';
			default:
				return 'bg-gray-500';
		}
	}

	function getStatusTextColor(status: string): string {
		switch (status) {
			case 'running':
				return 'text-green-400';
			case 'stopped':
				return 'text-gray-400';
			case 'error':
				return 'text-red-400';
			default:
				return 'text-gray-400';
		}
	}

	function getStatusLabel(status: string): string {
		switch (status) {
			case 'running':
				return 'Running';
			case 'stopped':
				return 'Stopped';
			case 'error':
				return 'Error';
			default:
				return 'Unknown';
		}
	}
</script>

<a
	href={app.url}
	class="glass rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 glass-hover no-underline text-inherit cursor-pointer group"
	target="_blank"
	rel="noopener noreferrer"
>
	<div class="text-5xl text-center mb-2 group-hover:scale-110 transition-transform duration-300">
		{app.icon}
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
		<span class="w-2 h-2 rounded-full {getStatusColor(app.status)} animate-pulse"></span>
		<span class="text-xs font-medium uppercase tracking-wider {getStatusTextColor(app.status)}">
			{getStatusLabel(app.status)}
		</span>
	</div>
</a>
