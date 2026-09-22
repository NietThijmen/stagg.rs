<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Check, Copy } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let { label, children }: { label: string; children: Snippet } = $props();

	let copied = $state(false);

	function copy(event: MouseEvent) {
		const text = event.currentTarget instanceof HTMLElement
			? (event.currentTarget.parentElement?.innerText ?? '')
			: '';
		navigator.clipboard.writeText(text.trim());
		copied = true;
		toast.success('Copied to clipboard');
		setTimeout(() => (copied = false), 1500);
	}
</script>

<div class="relative overflow-hidden rounded-lg border bg-muted p-4 font-mono text-sm">
	<button
		type="button"
		class="absolute top-2 right-2 rounded-md border bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
		onclick={copy}
		aria-label="Copy {label}"
	>
		{#if copied}
			<Check class="size-4" />
		{:else}
			<Copy class="size-4" />
		{/if}
	</button>
	<div class="pr-10">
		{@render children()}
	</div>
</div>
