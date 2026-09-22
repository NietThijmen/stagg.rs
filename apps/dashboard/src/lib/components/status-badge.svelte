<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils.js';

	let { status, class: className }: { status: string; class?: string } = $props();

	const variant = $derived.by(() => {
		switch (status) {
			case 'active':
			case 'enabled':
				return 'default' as const;
			case 'pending':
				return 'secondary' as const;
			case 'failed':
				return 'destructive' as const;
			default:
				return 'outline' as const;
		}
	});
</script>

<Badge {variant} class={cn('shrink-0 capitalize', className)}>{status}</Badge>
