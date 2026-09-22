<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table';
	import { ArrowLeft, Globe, Copy, Check } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let { data } = $props();
	const site = $derived(data.site);

	let copied = $state<'cname' | 'gtag' | null>(null);

	function statusVariant(status: string) {
		switch (status) {
			case 'active':
				return 'default';
			case 'pending':
				return 'secondary';
			case 'failed':
				return 'destructive';
			default:
				return 'outline';
		}
	}

	function formatDate(date: Date | string | null) {
		if (!date) return '—';
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(date));
	}

	function copyCode(type: 'cname' | 'gtag', text: string) {
		navigator.clipboard.writeText(text);
		copied = type;
		toast.success('Copied to clipboard');
		setTimeout(() => (copied = null), 1500);
	}

	const cnameRecord = $derived(`${site.hostname}\tCNAME\tedge.saas.example`);
	const gtagSnippet = $derived(
		`gtag('config', 'G-XXXXXXXXXX', {\n  server_container_url: 'https://${site.hostname}'\n});`
	);
</script>

<svelte:head>
	<title>{site.name} — Staggers</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center gap-4">
		<Button href="/app/websites" variant="ghost" size="sm" class="gap-1 pl-0">
			<ArrowLeft class="size-4" />
			Back
		</Button>
	</div>

	<div class="flex flex-col gap-1">
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-bold tracking-tight">{site.name}</h1>
			<Badge variant={statusVariant(site.status)} class="capitalize">{site.status}</Badge>
		</div>
		<p class="text-muted-foreground">{site.hostname}</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Globe class="size-5 text-primary" />
					Site details
				</CardTitle>
			</CardHeader>
			<CardContent class="grid gap-4 text-sm">
				<div class="grid grid-cols-2 gap-2">
					<span class="text-muted-foreground">Hostname</span>
					<span class="font-medium">{site.hostname}</span>
				</div>
				<div class="grid grid-cols-2 gap-2">
					<span class="text-muted-foreground">Preview hostname</span>
					<span class="font-medium">{site.previewHostname}</span>
				</div>
				<div class="grid grid-cols-2 gap-2">
					<span class="text-muted-foreground">Container ID</span>
					<span class="font-medium">{site.gtmContainerId ?? 'Pending'}</span>
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
				<div class="relative overflow-hidden rounded-md bg-muted p-4 font-mono text-sm">
					<button
						type="button"
						class="absolute top-2 right-2 rounded-md border bg-background p-1.5 text-muted-foreground hover:text-foreground"
						onclick={() => copyCode('cname', cnameRecord)}
						aria-label="Copy DNS record"
					>
						{#if copied === 'cname'}
							<Check class="size-4" />
						{:else}
							<Copy class="size-4" />
						{/if}
					</button>
					<div class="pr-8">
						<p>Name: {site.hostname}</p>
						<p>Type: CNAME</p>
						<p>Target: edge.saas.example</p>
					</div>
				</div>
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
			<div class="relative overflow-hidden rounded-md bg-muted p-4 font-mono text-sm">
				<button
					type="button"
					class="absolute top-2 right-2 rounded-md border bg-background p-1.5 text-muted-foreground hover:text-foreground"
					onclick={() => copyCode('gtag', gtagSnippet)}
					aria-label="Copy gtag snippet"
				>
					{#if copied === 'gtag'}
						<Check class="size-4" />
					{:else}
						<Copy class="size-4" />
					{/if}
				</button>
				<pre class="pr-8 whitespace-pre-wrap">{gtagSnippet}</pre>
			</div>
		</CardContent>
	</Card>

	<Separator />

	<div>
		<h2 class="mb-4 text-lg font-semibold">Recent deployments</h2>
		{#if site.deployments.length === 0}
			<Card>
				<CardContent class="py-8 text-center text-sm text-muted-foreground">
					No deployments yet.
				</CardContent>
			</Card>
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
								<Badge variant={statusVariant(deployment.status)} class="capitalize">
									{deployment.status}
								</Badge>
							</TableCell>
							<TableCell>{formatDate(deployment.startedAt)}</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</div>
</div>
