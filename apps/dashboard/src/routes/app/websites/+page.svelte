<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import PageHeader from '$lib/components/page-header.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Plus, Globe, ExternalLink } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Websites — Staggers</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<PageHeader title="Websites" description="Manage your sGTM sites and deployments.">
		{#snippet actions()}
			<Button href="/app/websites/new" size="sm">
				<Plus class="size-4" />
				Add website
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.sites.length === 0}
		<EmptyState
			icon={Globe}
			title="No websites yet"
			description="Get started by creating your first server-side GTM site."
		>
			{#snippet action()}
				<Button href="/app/websites/new" size="sm">
					<Plus class="size-4" />
					Add website
				</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.sites as site}
				<Card class="flex flex-col">
					<CardHeader>
						<div class="flex items-start justify-between gap-2">
							<CardTitle class="truncate">{site.name}</CardTitle>
							<StatusBadge status={site.status} />
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
