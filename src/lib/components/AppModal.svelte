<script lang="ts">
	interface App {
		id?: number;
		name: string;
		description: string;
		icon: string;
		url: string;
		status: 'running' | 'stopped' | 'error';
	}

	interface Props {
		isOpen: boolean;
		app?: App | null;
		onClose: () => void;
		onSave: (app: App) => void;
	}

	let { isOpen = false, app = null, onClose, onSave }: Props = $props();

	let formData = $state({
		name: '',
		description: '',
		icon: '',
		url: ''
	});

	let errors = $state<Record<string, string>>({});

	// Check if icon is a URL
	function isIconUrl(icon: string): boolean {
		return icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/');
	}

	// Reset form when modal opens/closes or app changes
	$effect(() => {
		if (isOpen && app) {
			formData = {
				name: app.name,
				description: app.description,
				icon: app.icon,
				url: app.url
			};
		} else if (isOpen && !app) {
			formData = {
				name: '',
				description: '',
				icon: '',
				url: ''
			};
		}
		errors = {};
	});

	function validate() {
		const newErrors: Record<string, string> = {};

		if (!formData.name.trim()) {
			newErrors.name = 'Name is required';
		}

		if (!formData.description.trim()) {
			newErrors.description = 'Description is required';
		}

		if (!formData.icon.trim()) {
			newErrors.icon = 'Icon is required (emoji or URL)';
		}

		if (!formData.url.trim()) {
			newErrors.url = 'URL is required';
		} else if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
			newErrors.url = 'URL must start with http:// or https://';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();

		if (!validate()) {
			return;
		}

		const appData: App = {
			...(app?.id && { id: app.id }),
			name: formData.name.trim(),
			description: formData.description.trim(),
			icon: formData.icon.trim(),
			url: formData.url.trim(),
			status: 'running'
		};

		onSave(appData);
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKeydown}
		role="button"
		tabindex="0"
	>
		<div class="glass rounded-2xl p-6 max-w-md w-full shadow-2xl">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-2xl font-bold text-white">
					{app ? 'Edit Application' : 'Add Application'}
				</h2>
				<button
					onclick={onClose}
					class="text-gray-400 hover:text-white transition-colors p-1"
					aria-label="Close"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<form onsubmit={handleSubmit} class="space-y-4">
				<!-- Name -->
				<div>
					<label for="name" class="block text-sm font-medium text-gray-300 mb-2">Name</label>
					<input
						type="text"
						id="name"
						bind:value={formData.name}
						class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
						placeholder="Plex"
					/>
					{#if errors.name}
						<p class="text-red-400 text-sm mt-1">{errors.name}</p>
					{/if}
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="block text-sm font-medium text-gray-300 mb-2"
						>Description</label
					>
					<input
						type="text"
						id="description"
						bind:value={formData.description}
						class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
						placeholder="Media Server"
					/>
					{#if errors.description}
						<p class="text-red-400 text-sm mt-1">{errors.description}</p>
					{/if}
				</div>

				<!-- Icon -->
				<div>
					<label for="icon" class="block text-sm font-medium text-gray-300 mb-2"
						>Icon (Emoji or URL)</label
					>
					<input
						type="text"
						id="icon"
						bind:value={formData.icon}
						class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
						placeholder="🎬 or https://example.com/icon.png"
					/>
					{#if errors.icon}
						<p class="text-red-400 text-sm mt-1">{errors.icon}</p>
					{:else}
						<p class="text-gray-400 text-xs mt-1">
							Use an emoji (🎬) or an image URL (https://...)
						</p>
					{/if}
					{#if formData.icon && isIconUrl(formData.icon)}
						<div class="mt-2 flex items-center gap-2">
							<span class="text-sm text-gray-400">Preview:</span>
							<img src={formData.icon} alt="Icon preview" class="w-8 h-8 object-contain" />
						</div>
					{:else if formData.icon}
						<div class="mt-2 flex items-center gap-2">
							<span class="text-sm text-gray-400">Preview:</span>
							<span class="text-2xl">{formData.icon}</span>
						</div>
					{/if}
				</div>

				<!-- URL -->
				<div>
					<label for="url" class="block text-sm font-medium text-gray-300 mb-2">URL</label>
					<input
						type="url"
						id="url"
						bind:value={formData.url}
						class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
						placeholder="http://localhost:32400"
					/>
					{#if errors.url}
						<p class="text-red-400 text-sm mt-1">{errors.url}</p>
					{/if}
				</div>

				<!-- Actions -->
				<div class="flex gap-3 pt-4">
					<button
						type="button"
						onclick={onClose}
						class="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg text-white font-medium transition-colors"
					>
						{app ? 'Update' : 'Add'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
