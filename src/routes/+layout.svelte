<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="description" content="zamOS - Home Server Dashboard" />
	<title>zamOS - Home Server Dashboard</title>
</svelte:head>

{@render children?.()}
