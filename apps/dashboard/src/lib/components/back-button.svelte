<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from '@lucide/svelte';

	let { href, label = 'Back' }: { href: string; label?: string } = $props();
</script>

<div>
	<Button {href} variant="ghost" size="sm" class="gap-1 pl-0 text-muted-foreground hover:text-foreground">
		<ArrowLeft class="size-4" />
		{label}
	</Button>
</div>
