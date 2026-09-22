<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import PageHeader from '$lib/components/page-header.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import { Building2, Plus } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Organizations — Staggers</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-8">
	<PageHeader title="Organizations" description="Manage the organizations you belong to.">
		{#snippet actions()}
			<Button href="/app/organizations/new" size="sm">
				<Plus class="size-4" />
				New organization
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.organizations.length === 0}
		<EmptyState
			icon={Building2}
			title="No organizations yet"
			description="Create your first organization to get started."
		>
			{#snippet action()}
				<Button href="/app/organizations/new" size="sm">Create organization</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="grid gap-4">
			{#each data.organizations as org}
				<Card>
					<CardHeader class="pb-3">
						<CardTitle>{org.name}</CardTitle>
						<CardDescription>
							Created {new Date(org.createdAt).toLocaleDateString()}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button href="/app/organizations/{org.id}" variant="outline" size="sm">
							Manage
						</Button>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>
