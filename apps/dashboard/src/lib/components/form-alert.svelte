<script lang="ts">
	import { AlertCircle, CheckCircle2 } from '@lucide/svelte';

	let { variant, message }: { variant: 'error' | 'success'; message: string } = $props();
</script>

{#if variant === 'error'}
	<div class="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
		<AlertCircle class="size-4 shrink-0" />
		{message}
	</div>
{:else}
	<div class="flex items-center gap-2 rounded-md bg-success/10 p-3 text-sm text-success">
		<CheckCircle2 class="size-4 shrink-0" />
		{message}
	</div>
{/if}
