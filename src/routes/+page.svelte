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
	let isOnline = $state(true);

	$effect(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});

	$effect(() => {
		const handleOnline = () => (isOnline = true);
		const handleOffline = () => (isOnline = false);

		isOnline = navigator.onLine;
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
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

<div class="min-h-screen bg-mac-deep grid-mac p-2 sm:p-4 md:p-8 app-container screen-flicker">
	<!-- Clean Header -->
	<header class="mb-4 md:mb-6 max-w-6xl mx-auto">
		<div
			class="menu-bar-mac px-2 md:px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-0"
		>
			<span class="font-system text-mac-primary text-xs sm:text-sm">zamOS</span>
			<div
				class="font-terminal text-mac-secondary flex items-center gap-2 md:gap-3 text-sm md:text-base"
			>
				{#if !isOnline}
					<span class="text-nes-red font-bold text-xs" title="Offline mode">OFFLINE</span>
				{/if}
				<span class="text-xs md:text-base">{formatDate(currentTime)}</span>
				<span class="text-nes-cyan text-xs md:text-base">{formatTime(currentTime)}</span>
			</div>
		</div>
	</header>

	<!-- Main Window - Classic Mac Style -->
	<main class="max-w-6xl mx-auto">
		<div class="window-chrome">
			<!-- Window Title Bar - Active -->
			<div
				class="window-title-active flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2"
			>
				<div class="flex items-center gap-2 sm:gap-3">
					<button onclick={handleCloseWindow} class="mac-close-btn" aria-label="Close"></button>
					<span class="text-[10px] sm:text-xs">zamOS Desktop v{VERSION}</span>
				</div>
				<div class="flex items-center gap-2">
					{#if !isOnline}
						<span class="text-nes-red font-terminal text-[8px] sm:text-xs">OFFLINE</span>
					{/if}
					<div
						class="w-2 h-2 sm:w-3 sm:h-3 {isOnline
							? 'bg-nes-lime'
							: 'bg-nes-red'} animate-pulse-pixel"
					></div>
				</div>
			</div>

			<!-- Window Content -->
			<div class="p-3 sm:p-4 md:p-6 bg-mac-dark dither-mac">
				<!-- Header Content -->
				<div
					class="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 mb-6 md:mb-8 pb-4 md:pb-6 border-b-2 border-mac-platinum-dark"
				>
					<div class="flex items-center gap-3 md:gap-4">
						<div class="text-center md:text-left">
							<h1
								class="font-system text-lg md:text-xl text-nes-cyan uppercase tracking-wider mb-1"
							>
								zamOS
							</h1>
							<p class="font-terminal text-mac-secondary tracking-wide text-sm md:text-base">
								Home Server Dashboard
							</p>
						</div>
					</div>

					<button
						onclick={openAddModal}
						class="btn-mac btn-nes text-xs md:text-sm py-2 px-3 md:py-3 md:px-4"
					>
						<span>[+]</span> ADD APP
					</button>
				</div>

				<!-- Applications Section -->
				<section class="mb-6 md:mb-8">
					<!-- Section Header -->
					<div class="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
						<div class="h-px flex-1 bg-mac-platinum-dark"></div>
						<h2
							class="font-system text-nes-yellow uppercase tracking-widest text-[10px] md:text-sm"
						>
							Applications ({apps.length})
						</h2>
						<div class="h-px flex-1 bg-mac-platinum-dark"></div>
					</div>

					<!-- Apps Grid -->
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
						{#each apps as app (app.id)}
							<AppCard {app} {appStatuses} onEdit={openEditModal} onDelete={handleDelete} />
						{/each}
					</div>

					{#if apps.length === 0}
						<div class="card-mac p-6 md:p-8 text-center">
							<p class="font-system text-mac-muted uppercase text-xs md:text-sm">
								No Applications Found
							</p>
							<p class="font-terminal text-mac-tertiary mt-2 text-sm md:text-base">
								Click "ADD APP" to get started
							</p>
						</div>
					{/if}
				</section>

				<!-- System Stats Section -->
				<section class="mt-6 md:mt-8 pt-4 md:pt-6 border-t-2 border-mac-platinum-dark">
					<SystemStats />
				</section>
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="mt-4 md:mt-8 pb-4 md:pb-8 max-w-6xl mx-auto px-4 md:px-0">
		<div class="card-mac p-3 md:p-4 text-center">
			<div
				class="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm"
			>
				<div class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
					<span class="font-system-sm text-mac-secondary uppercase">zamOS v{VERSION}</span>
					<span class="hidden sm:inline text-mac-platinum">•</span>
					<span class="font-system-sm text-mac-secondary">{currentTime.getFullYear()}</span>
				</div>
				<span class="hidden sm:inline text-mac-platinum">•</span>
				<span class="font-system-sm text-nes-lime">SYSTEM READY</span>
				<span class="hidden sm:inline text-mac-platinum">•</span>
				<span class="font-system-sm text-nes-cyan animate-pulse-pixel">█</span>
			</div>
		</div>
	</footer>
</div>

<AppModal isOpen={isModalOpen} app={editingApp} onClose={closeModal} onSave={handleSave} />
