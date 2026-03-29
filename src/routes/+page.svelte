<script lang="ts">
	import SystemStats from '$lib/components/SystemStats.svelte';
	import AppCard from '$lib/components/AppCard.svelte';
	import { VERSION } from '$lib/index.js';

	import AppModal from '$lib/components/AppModal.svelte';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';

	interface Props {
		data: PageData;
	}

	interface AppStatus {
		url: string;
		status: 'online' | 'offline' | 'checking';
		responseTime: number;
	}

	let { data }: Props = $props();
	let apps = $derived(data.apps);

	let currentTime = $state(new Date());
	let isModalOpen = $state(false);
	let editingApp = $state<(typeof apps)[0] | null>(null);
	let appStatuses = $state<Record<string, AppStatus>>({});

	$effect(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});

	async function checkAllAppStatuses() {
		if (apps.length === 0) return;

		const newStatuses: Record<string, AppStatus> = { ...appStatuses };
		apps.forEach((app) => {
			newStatuses[app.url] = {
				url: app.url,
				status: 'checking',
				responseTime: 0
			};
		});
		appStatuses = newStatuses;

		try {
			const urls = apps.map((app) => app.url);
			const response = await fetch('/api/apps/status/batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ urls })
			});

			if (response.ok) {
				const data = await response.json();
				const newStatuses: Record<string, AppStatus> = {};
				data.results.forEach((result: AppStatus) => {
					newStatuses[result.url] = result;
				});
				appStatuses = newStatuses;
			}
		} catch (error) {
			console.error('Failed to check app statuses:', error);
			const newStatuses: Record<string, AppStatus> = { ...appStatuses };
			apps.forEach((app) => {
				newStatuses[app.url] = {
					url: app.url,
					status: 'offline',
					responseTime: 0
				};
			});
			appStatuses = newStatuses;
		}
	}

	let mounted = $state(false);

	$effect(() => {
		if (!mounted && apps.length > 0) {
			mounted = true;
			checkAllAppStatuses();
		}
	});

	$effect(() => {
		if (!mounted) return;
		const interval = setInterval(checkAllAppStatuses, 30000);
		return () => clearInterval(interval);
	});

	function openAddModal() {
		editingApp = null;
		isModalOpen = true;
	}

	function openEditModal(app: (typeof apps)[0]) {
		editingApp = app;
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
		editingApp = null;
	}

	function handleCloseWindow() {
		// Navigate to a shutdown/goodbye page or close the application view
		window.location.href = '/shutdown';
	}

	async function handleSave(app: (typeof apps)[0]) {
		try {
			if (app.id) {
				const response = await fetch('/api/apps', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(app)
				});

				if (!response.ok) throw new Error('Failed to update app');
			} else {
				const response = await fetch('/api/apps', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(app)
				});

				if (!response.ok) throw new Error('Failed to create app');
			}

			await invalidateAll();
			closeModal();
		} catch (error) {
			console.error('Error saving app:', error);
			alert('FAILED TO SAVE APPLICATION');
		}
	}

	async function handleDelete(id: number) {
		try {
			const response = await fetch('/api/apps', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});

			if (!response.ok) throw new Error('Failed to delete app');

			await invalidateAll();
		} catch (error) {
			console.error('Error deleting app:', error);
			alert('FAILED TO DELETE APPLICATION');
		}
	}

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function formatDate(date: Date): string {
		return date
			.toLocaleDateString('en-US', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			})
			.replace(/\//g, '-');
	}
</script>

<div class="min-h-screen bg-mac-deep grid-mac p-4 md:p-8 app-container screen-flicker">
	<!-- Clean Header -->
	<header class="mb-6 max-w-6xl mx-auto">
		<div class="menu-bar-mac px-4 py-2 flex items-center justify-between">
			<span class="font-system text-mac-primary">zamOS</span>
			<div class="font-terminal text-mac-secondary flex items-center gap-3">
				<span>{formatDate(currentTime)}</span>
				<span class="text-nes-cyan">{formatTime(currentTime)}</span>
			</div>
		</div>
	</header>

	<!-- Main Window - Classic Mac Style -->
	<main class="max-w-6xl mx-auto">
		<div class="window-chrome">
			<!-- Window Title Bar - Active -->
			<div class="window-title-active flex items-center justify-between">
				<div class="flex items-center gap-3">
					<button onclick={handleCloseWindow} class="mac-close-btn" aria-label="Close"></button>
					<span>zamOS Desktop v{VERSION}</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 bg-nes-lime animate-pulse-pixel"></div>
				</div>
			</div>

			<!-- Window Content -->
			<div class="p-6 bg-mac-dark dither-mac">
				<!-- Header Content -->
				<div
					class="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-mac-platinum-dark"
				>
					<div class="flex items-center gap-4">
						<div>
							<h1 class="font-system text-xl text-nes-cyan uppercase tracking-wider mb-1">zamOS</h1>
							<p class="font-terminal text-mac-secondary tracking-wide">Home Server Dashboard</p>
						</div>
					</div>

					<button onclick={openAddModal} class="btn-mac btn-nes">
						<span>[+]</span> ADD APP
					</button>
				</div>

				<!-- Applications Section -->
				<section class="mb-8">
					<!-- Section Header -->
					<div class="flex items-center gap-4 mb-6">
						<div class="h-px flex-1 bg-mac-platinum-dark"></div>
						<h2 class="font-system text-nes-yellow uppercase tracking-widest text-sm">
							Applications ({apps.length})
						</h2>
						<div class="h-px flex-1 bg-mac-platinum-dark"></div>
					</div>

					<!-- Apps Grid -->
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{#each apps as app (app.id)}
							<AppCard {app} {appStatuses} onEdit={openEditModal} onDelete={handleDelete} />
						{/each}
					</div>

					{#if apps.length === 0}
						<div class="card-mac p-8 text-center">
							<p class="font-system text-mac-muted uppercase">No Applications Found</p>
							<p class="font-terminal text-mac-tertiary mt-2">Click "ADD APP" to get started</p>
						</div>
					{/if}
				</section>

				<!-- System Stats Section -->
				<section class="mt-8 pt-6 border-t-2 border-mac-platinum-dark">
					<SystemStats />
				</section>
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="mt-8 pb-8 max-w-6xl mx-auto">
		<div class="card-mac p-4 text-center">
			<div class="flex items-center justify-center gap-4">
				<span class="font-system-sm text-mac-secondary uppercase">zamOS v{VERSION}</span>
				<span class="text-mac-platinum">•</span>
				<span class="font-system-sm text-mac-secondary">{currentTime.getFullYear()}</span>
				<span class="text-mac-platinum">•</span>
				<span class="font-system-sm text-nes-lime">SYSTEM READY</span>
				<span class="text-mac-platinum">•</span>
				<span class="font-system-sm text-nes-cyan">█</span>
			</div>
		</div>
	</footer>
</div>

<AppModal isOpen={isModalOpen} app={editingApp} onClose={closeModal} onSave={handleSave} />
