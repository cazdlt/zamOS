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

	function isIconUrl(icon: string): boolean {
		return icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/');
	}

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
			newErrors.name = 'REQUIRED!';
		}

		if (!formData.description.trim()) {
			newErrors.description = 'REQUIRED!';
		}

		if (!formData.icon.trim()) {
			newErrors.icon = 'REQUIRED!';
		}

		if (!formData.url.trim()) {
			newErrors.url = 'REQUIRED!';
		} else if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
			newErrors.url = 'NEEDS HTTP:// OR HTTPS://';
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
		class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-mac-backdrop"
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKeydown}
		role="button"
		tabindex="0"
	>
		<div class="window-chrome max-w-md w-full">
			<!-- Window Title Bar - Mac Style -->
			<div class="window-title-active flex items-center justify-between">
				<div class="flex items-center gap-3">
					<button onclick={onClose} class="mac-close-btn" aria-label="Close"></button>
					<span>{app ? 'Edit Application' : 'New Application'}</span>
				</div>
			</div>

			<!-- Form Content -->
			<div class="p-6 bg-mac-dark">
				<form onsubmit={handleSubmit} class="space-y-4">
					<!-- Name -->
					<div>
						<label for="name" class="font-system text-xs text-nes-cyan mb-2 block uppercase">
							Name
						</label>
						<input
							type="text"
							id="name"
							bind:value={formData.name}
							class="input-mac w-full"
							placeholder="APP NAME"
						/>
						{#if errors.name}
							<p class="text-nes-red font-system text-xs mt-1 uppercase">
								{errors.name}
							</p>
						{/if}
					</div>

					<!-- Description -->
					<div>
						<label for="description" class="font-system text-xs text-nes-cyan mb-2 block uppercase">
							Description
						</label>
						<input
							type="text"
							id="description"
							bind:value={formData.description}
							class="input-mac w-full"
							placeholder="WHAT IT DOES"
						/>
						{#if errors.description}
							<p class="text-nes-red font-system text-xs mt-1 uppercase">
								{errors.description}
							</p>
						{/if}
					</div>

					<!-- Icon -->
					<div>
						<label for="icon" class="font-system text-xs text-nes-cyan mb-2 block uppercase">
							Icon (Emoji or URL)
						</label>
						<input
							type="text"
							id="icon"
							bind:value={formData.icon}
							class="input-mac w-full"
							placeholder="🎬 OR HTTPS://..."
						/>
						{#if errors.icon}
							<p class="text-nes-red font-system text-xs mt-1 uppercase">
								{errors.icon}
							</p>
						{/if}

						<!-- Icon Preview -->
						{#if formData.icon}
							<div class="mt-2 flex items-center gap-2 p-2 card-mac-inset">
								<span class="font-system text-[10px] text-mac-secondary">PREVIEW:</span>
								{#if isIconUrl(formData.icon)}
									<img src={formData.icon} alt="Preview" class="w-8 h-8 object-contain" />
								{:else}
									<span class="text-2xl">{formData.icon}</span>
								{/if}
							</div>
						{/if}
					</div>

					<!-- URL -->
					<div>
						<label for="url" class="font-system text-xs text-nes-cyan mb-2 block uppercase">
							URL
						</label>
						<input
							type="url"
							id="url"
							bind:value={formData.url}
							class="input-mac w-full"
							placeholder="HTTP://LOCALHOST:3000"
						/>
						{#if errors.url}
							<p class="text-nes-red font-system text-xs mt-1 uppercase">
								{errors.url}
							</p>
						{/if}
					</div>

					<!-- Actions -->
					<div class="flex gap-3 pt-4 border-t-2 border-mac-platinum-dark">
						<button type="button" onclick={onClose} class="btn-mac flex-1"> CANCEL </button>
						<button
							type="submit"
							class="btn-mac flex-1"
							style="background: linear-gradient(180deg, rgba(0, 229, 255, 0.2) 0%, rgba(0, 229, 255, 0.1) 100%); border-color: var(--nes-cyan) var(--mac-shadow) var(--mac-shadow) var(--nes-cyan); color: var(--nes-cyan); text-shadow: 0 0 5px rgba(0, 229, 255, 0.5);"
						>
							{app ? 'UPDATE' : 'CREATE'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
