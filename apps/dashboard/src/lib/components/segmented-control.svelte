<script lang="ts">
	let {
		options,
		value
	}: {
		options: { value: string; label: string; href?: string }[];
		value: string;
	} = $props();
</script>

<div class="flex items-center gap-0.5 rounded-md border bg-card p-0.5">
	{#each options as option}
		<a
			href={option.href ?? '#'}
			class="rounded-[calc(var(--radius)-4px)] px-2.5 py-1 text-xs font-medium transition-colors {option.value ===
			value
				? 'bg-secondary text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
		>
			{option.label}
		</a>
	{/each}
</div>
