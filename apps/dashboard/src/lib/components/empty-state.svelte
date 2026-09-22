<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Component } from 'svelte';

	let {
		icon: Icon,
		title,
		description,
		action
	}: {
		icon?: Component;
		title: string;
		description?: string;
		action?: Snippet;
	} = $props();
</script>

<div class="flex flex-col items-center justify-center gap-3 rounded-lg border bg-card px-6 py-16 text-center">
	{#if Icon}
		<Icon class="size-5 text-muted-foreground" />
	{/if}
	<div class="flex flex-col gap-1">
		<p class="text-sm font-medium">{title}</p>
		{#if description}
			<p class="text-sm text-muted-foreground">{description}</p>
		{/if}
	</div>
	{#if action}
		<div class="mt-2">
			{@render action()}
		</div>
	{/if}
</div>
