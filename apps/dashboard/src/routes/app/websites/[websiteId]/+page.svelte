<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
	} from '$lib/components/ui/select';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table';
	import { Plus, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import BarChart from '$lib/components/analytics/bar-chart.svelte';
	import LineChart from '$lib/components/analytics/line-chart.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import BackButton from '$lib/components/back-button.svelte';
	import StatTile from '$lib/components/stat-tile.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import CodeBlock from '$lib/components/code-block.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import SegmentedControl from '$lib/components/segmented-control.svelte';
	import {
		formatBucket,
		formatDate,
		formatDuration,
		formatNumber,
		formatPercent,
	} from '$lib/format.js';

	let { data } = $props();
	const site = $derived(data.site);

	const rangeOptions = [
		{ value: '24h', label: '24h', href: '?range=24h' },
		{ value: '7d', label: '7d', href: '?range=7d' },
		{ value: '30d', label: '30d', href: '?range=30d' },
	];

	const rangeLabel = $derived(
		rangeOptions.find((option) => option.value === data.range)?.label ?? '24h'
	);

	const requestSeries = $derived(
		(data.analytics?.points ?? []).map((point) => ({
			label: formatBucket(point.bucket),
			value: point.total,
			error: point.errors,
		}))
	);

	const latencySeries = $derived(
		(data.analytics?.points ?? []).map((point) => ({
			label: formatBucket(point.bucket),
			value: Math.round(point.p95Latency),
		}))
	);

	let protocol = $state('https');

	const enhanceResult: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success('Destination saved');
			} else if (result.type === 'failure') {
				toast.error((result.data as { error?: string } | undefined)?.error ?? 'Something went wrong');
			}
			await update();
		};
	};

	const gtagSnippet = $derived(
		`gtag('config', 'G-XXXXXXXXXX', {\n  server_container_url: 'https://${site.hostname}'\n});`
	);
</script>

<svelte:head>
	<title>{site.name} — Staggers</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<BackButton href="/app/websites" label="Back to websites" />

	<PageHeader title={site.name} description={site.hostname}>
		{#snippet actions()}
			<StatusBadge status={site.status} />
		{/snippet}
	</PageHeader>

	<Card>
		<CardHeader class="flex flex-row items-center justify-between gap-4">
			<div class="flex flex-col gap-1.5">
				<CardTitle>Analytics</CardTitle>
				<CardDescription>Requests and latency from the last {rangeLabel}.</CardDescription>
			</div>
			<SegmentedControl options={rangeOptions} value={data.range} />
		</CardHeader>
		<CardContent class="flex flex-col gap-6">
			{#if data.analyticsError}
				<p class="text-sm text-destructive">Analytics unavailable: {data.analyticsError}</p>
			{:else if !data.analytics || data.analytics.total === 0}
				<p class="text-sm text-muted-foreground">No requests recorded in this period yet.</p>
			{:else}
				<div class="grid gap-4 sm:grid-cols-3">
					<StatTile label="Total requests" value={formatNumber(data.analytics.total)} />
					<StatTile label="Error rate" value={formatPercent(data.analytics.errorRate)} />
					<StatTile label="p95 latency" value={formatDuration(data.analytics.p95Latency)} />
				</div>

				<div>
					<p class="mb-2 text-sm font-medium">Requests</p>
					<BarChart data={requestSeries} formatValue={formatNumber} />
				</div>

				<div>
					<p class="mb-2 text-sm font-medium">p95 latency (ms)</p>
					<LineChart data={latencySeries} formatValue={formatDuration} />
				</div>
			{/if}
		</CardContent>
	</Card>

	<div class="grid gap-4 lg:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle>Site details</CardTitle>
			</CardHeader>
			<CardContent class="grid gap-3 text-sm">
				<div class="grid grid-cols-2 gap-2">
					<span class="text-muted-foreground">Hostname</span>
					<span class="font-medium">{site.hostname}</span>
				</div>
				<div class="grid grid-cols-2 gap-2">
					<span class="text-muted-foreground">Preview hostname</span>
					<span class="font-medium">{site.previewHostname}</span>
				</div>
				<div class="grid grid-cols-2 gap-2">
					<span class="text-muted-foreground">Container config</span>
					<span class="font-medium">
						{site.containerConfigSecretName ? 'Configured' : 'Pending'}
					</span>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>DNS setup</CardTitle>
				<CardDescription>
					Point your hostname to the Staggers edge cluster.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<CodeBlock label="DNS record">
					<p>Name: {site.hostname}</p>
					<p>Type: CNAME</p>
					<p>Target: edge.saas.example</p>
				</CodeBlock>
			</CardContent>
		</Card>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Website configuration</CardTitle>
			<CardDescription>
				Add this snippet to your client-side gtag config to route hits through the server container.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<CodeBlock label="gtag snippet">
				<pre class="whitespace-pre-wrap">{gtagSnippet}</pre>
			</CodeBlock>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Downstream destinations</CardTitle>
			<CardDescription>
				Hosts the server container is allowed to forward events to through the egress proxy.
			</CardDescription>
		</CardHeader>
		<CardContent class="flex flex-col gap-6">
			{#if site.destinations.length === 0}
				<p class="text-sm text-muted-foreground">No destinations configured yet.</p>
			{:else}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Host</TableHead>
							<TableHead>Status</TableHead>
							<TableHead class="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each site.destinations as destination (destination.id)}
							<TableRow>
								<TableCell class="font-medium">{destination.name}</TableCell>
								<TableCell class="font-mono text-xs">
									{destination.host}:{destination.port}
								</TableCell>
								<TableCell>
									<StatusBadge status={destination.enabled ? 'enabled' : 'disabled'} />
								</TableCell>
								<TableCell>
									<div class="flex justify-end gap-2">
										<form method="POST" action="?/toggleDestination" use:enhance={enhanceResult}>
											<input type="hidden" name="destinationId" value={destination.id} />
											<Button type="submit" variant="outline" size="sm">
												{destination.enabled ? 'Disable' : 'Enable'}
											</Button>
										</form>
										<form method="POST" action="?/deleteDestination" use:enhance={enhanceResult}>
											<input type="hidden" name="destinationId" value={destination.id} />
											<Button
												type="submit"
												variant="ghost"
												size="icon-sm"
												aria-label="Delete destination"
											>
												<Trash2 class="size-4" />
											</Button>
										</form>
									</div>
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{/if}

			<form
				method="POST"
				action="?/addDestination"
				use:enhance={enhanceResult}
				class="grid gap-3 sm:grid-cols-[1fr_1fr_7rem_7rem_auto] sm:items-end"
			>
				<div class="flex flex-col gap-2">
					<Label for="destination-name">Name</Label>
					<Input id="destination-name" name="name" placeholder="Google Analytics" required />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="destination-host">Host</Label>
					<Input id="destination-host" name="host" placeholder="www.google-analytics.com" required />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="destination-port">Port</Label>
					<Input id="destination-port" name="port" type="number" value="443" min="1" max="65535" />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="destination-protocol">Protocol</Label>
					<Select type="single" name="protocol" bind:value={protocol}>
						<SelectTrigger id="destination-protocol" class="w-full">
							{protocol.toUpperCase()}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="https">HTTPS</SelectItem>
							<SelectItem value="http">HTTP</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<Button type="submit" class="gap-1">
					<Plus class="size-4" />
					Add
				</Button>
			</form>
		</CardContent>
	</Card>

	<div class="flex flex-col gap-3">
		<h2 class="text-base font-semibold">Recent traces</h2>
		{#if data.traces.length === 0}
			<EmptyState title="No traces yet" />
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Trace</TableHead>
						<TableHead>Spans</TableHead>
						<TableHead>Max duration</TableHead>
						<TableHead>Last seen</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each data.traces as trace (trace.traceId)}
						<TableRow>
							<TableCell>
								<a
									class="font-mono text-xs underline-offset-4 hover:underline"
									href={`/app/websites/${site.id}/traces/${trace.traceId}`}
								>
									{trace.traceId.slice(0, 16)}…
								</a>
								{#if trace.errors > 0}
									<Badge variant="destructive" class="ml-2">{trace.errors} errors</Badge>
								{/if}
							</TableCell>
							<TableCell>{trace.spans}</TableCell>
							<TableCell>{formatDuration(trace.maxDurationMs)}</TableCell>
							<TableCell class="text-muted-foreground">{formatDate(trace.lastSeen)}</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</div>

	<div class="flex flex-col gap-3">
		<h2 class="text-base font-semibold">Recent deployments</h2>
		{#if site.deployments.length === 0}
			<EmptyState title="No deployments yet" />
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Revision</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Started</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each site.deployments as deployment}
						<TableRow>
							<TableCell class="font-mono text-xs">{deployment.revision}</TableCell>
							<TableCell>
								<StatusBadge status={deployment.status} />
							</TableCell>
							<TableCell class="text-muted-foreground">{formatDate(deployment.startedAt)}</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</div>
</div>
