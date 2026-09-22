<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Plus, Globe, ExternalLink } from '@lucide/svelte';

	let { data } = $props();

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
</script>

<svelte:head>
	<title>Websites — Staggers</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Websites</h1>
			<p class="text-muted-foreground">Manage your sGTM sites and deployments.</p>
		</div>
		<Button href="/app/websites/new">
			<Plus class="size-4" />
			Add website
		</Button>
	</div>

	{#if data.sites.length === 0}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Globe class="size-5 text-muted-foreground" />
					No websites yet
				</CardTitle>
				<CardDescription>
					Get started by creating your first server-side GTM site.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button href="/app/websites/new">
					<Plus class="size-4" />
					Add website
				</Button>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.sites as site}
				<Card class="flex flex-col">
					<CardHeader>
						<div class="flex items-start justify-between gap-2">
							<CardTitle class="truncate text-lg">{site.name}</CardTitle>
							<Badge variant={statusVariant(site.status)} class="shrink-0 capitalize">
								{site.status}
							</Badge>
						</div>
						<CardDescription class="truncate">{site.hostname}</CardDescription>
					</CardHeader>
					<CardContent class="mt-auto pt-0">
						<div class="flex items-center gap-2">
							<Button href="/app/websites/{site.id}" variant="secondary" size="sm" class="flex-1">
								Manage
							</Button>
							<Button
								href="https://{site.hostname}"
								variant="outline"
								size="icon-sm"
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLink class="size-4" />
								<span class="sr-only">Open {site.hostname}</span>
							</Button>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>
