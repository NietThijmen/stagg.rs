<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table';
	import BackButton from '$lib/components/back-button.svelte';
	import { formatTimestamp } from '$lib/format.js';

	let { data } = $props();

	const byId = $derived(new Map(data.spans.map((span) => [span.spanId, span])));

	const rows = $derived(data.spans.map((span) => ({ ...span, depth: depthOf(span) })));

	function depthOf(span: (typeof data.spans)[number]) {
		let depth = 0;
		let parent = span.parentSpanId;
		const guard = new Set<string>();

		while (parent && byId.has(parent) && !guard.has(parent)) {
			guard.add(parent);
			depth += 1;
			parent = byId.get(parent)?.parentSpanId ?? '';
		}

		return depth;
	}

	function formatDuration(value: number) {
		return `${value.toFixed(1)} ms`;
	}
</script>

<svelte:head>
	<title>Trace {data.traceId.slice(0, 12)} — Staggers</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<BackButton href={`/app/websites/${data.site.id}`} label="Back to {data.site.name}" />

	<Card>
		<CardHeader>
			<CardTitle>Trace detail</CardTitle>
			<CardDescription class="font-mono">{data.traceId}</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.traceError}
				<p class="text-sm text-destructive">Failed to load trace: {data.traceError}</p>
			{:else if rows.length === 0}
				<p class="text-sm text-muted-foreground">No spans found for this trace.</p>
			{:else}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Span</TableHead>
							<TableHead>Service</TableHead>
							<TableHead>Duration</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Timestamp</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each rows as row (row.spanId)}
							<TableRow>
								<TableCell>
									<span style={`padding-left: ${row.depth * 1.25}rem`} class="font-medium">
										{row.name}
									</span>
								</TableCell>
								<TableCell class="text-muted-foreground">{row.service}</TableCell>
								<TableCell>{formatDuration(row.durationMs)}</TableCell>
								<TableCell>
									<Badge
										variant={row.statusCode === 'STATUS_CODE_ERROR' ? 'destructive' : 'outline'}
									>
										{row.statusCode.replace('STATUS_CODE_', '').toLowerCase()}
									</Badge>
								</TableCell>
								<TableCell class="text-muted-foreground">{formatTimestamp(row.timestamp)}</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</CardContent>
	</Card>
</div>
