<script lang="ts">
	let { label, value }: { label: string; value: string | number } = $props();
</script>

<div class="rounded-lg border bg-card p-4">
	<p class="text-xs text-muted-foreground">{label}</p>
	<p class="mt-1 text-xl font-medium">{value}</p>
</div>
