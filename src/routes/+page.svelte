<script lang="ts">
	import SystemStats from '$lib/components/SystemStats.svelte';
	import AppCard from '$lib/components/AppCard.svelte';

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
	let statusUpdateKey = $state(0);

	// Update time every second
	$effect(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});

	// Batch status checking for all apps
	async function checkAllAppStatuses() {
		if (apps.length === 0) return;

		// Mark all as checking
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
				statusUpdateKey++;
			}
		} catch (error) {
			console.error('Failed to check app statuses:', error);
			// Mark all as offline on error
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

	// Check status on mount and every 30 seconds
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

	async function handleSave(app: (typeof apps)[0]) {
		try {
			if (app.id) {
				// Update existing app
				const response = await fetch('/api/apps', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(app)
				});

				if (!response.ok) throw new Error('Failed to update app');
			} else {
				// Create new app
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
			alert('Failed to save application');
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
			alert('Failed to delete application');
		}
	}
</script>

<div class="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900">
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
		<!-- Metrics Section -->
		<section class="mb-8">
			<h2 class="text-xl font-semibold text-white mb-4">System Status</h2>
			<SystemStats />
		</section>

		<!-- Applications Section -->
		<section class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-semibold text-white">Applications</h2>
				<button
					onclick={openAddModal}
					class="px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Add App
				</button>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{#each apps as app (app.id)}
					<AppCard {app} {appStatuses} onEdit={openEditModal} onDelete={handleDelete} />
				{/each}
			</div>
		</section>
	</main>
</div>

<AppModal isOpen={isModalOpen} app={editingApp} onClose={closeModal} onSave={handleSave} />
