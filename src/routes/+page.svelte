<script lang="ts">
	import SystemStats from '$lib/components/SystemStats.svelte';
	import AppCard from '$lib/components/AppCard.svelte';
	import NetworkStats from '$lib/components/NetworkStats.svelte';

	interface App {
		name: string;
		description: string;
		icon: string;
		url: string;
		status: 'running' | 'stopped' | 'error';
	}

	const apps: App[] = [
		{
			name: 'Plex',
			description: 'Media Server',
			icon: '🎬',
			url: 'http://localhost:32400',
			status: 'running'
		},
		{
			name: 'Home Assistant',
			description: 'Home Automation',
			icon: '🏠',
			url: 'http://localhost:8123',
			status: 'running'
		},
		{
			name: 'Nextcloud',
			description: 'File Storage',
			icon: '☁️',
			url: 'http://localhost:8080',
			status: 'running'
		},
		{
			name: 'Pi-hole',
			description: 'Ad Blocker',
			icon: '🛡️',
			url: 'http://localhost:80',
			status: 'running'
		},
		{
			name: 'Portainer',
			description: 'Container Manager',
			icon: '🐳',
			url: 'http://localhost:9000',
			status: 'running'
		},
		{
			name: 'Grafana',
			description: 'Monitoring',
			icon: '📊',
			url: 'http://localhost:3000',
			status: 'stopped'
		},
		{
			name: 'Jellyfin',
			description: 'Media System',
			icon: '📺',
			url: 'http://localhost:8096',
			status: 'running'
		},
		{
			name: 'GitLab',
			description: 'Git Repository',
			icon: '🦊',
			url: 'http://localhost:8929',
			status: 'error'
		}
	];

	let currentTime = $state(new Date());

	// Update time every second
	$effect(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
	<!-- Header -->
	<header class="sticky top-0 z-50 glass border-b border-white/10">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			<div class="flex flex-col sm:flex-row justify-between items-center gap-4">
				<div class="flex items-center gap-4">
					<span class="text-4xl">🖥️</span>
					<h1 class="text-3xl font-bold text-gradient">zamOS</h1>
				</div>
				<div class="text-sm text-gray-400 tabular-nums">
					{currentTime.toLocaleTimeString()} • {currentTime.toLocaleDateString()}
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- System Status Section -->
		<section class="mb-12">
			<h2 class="text-2xl font-semibold text-white mb-6">System Status</h2>
			<SystemStats />
		</section>

		<!-- Network Activity Section -->
		<section class="mb-12">
			<h2 class="text-2xl font-semibold text-white mb-6">Network Activity</h2>
			<NetworkStats />
		</section>

		<!-- Applications Section -->
		<section class="mb-12">
			<h2 class="text-2xl font-semibold text-white mb-6">Applications</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{#each apps as app}
					<AppCard {app} />
				{/each}
			</div>
		</section>
	</main>
</div>
