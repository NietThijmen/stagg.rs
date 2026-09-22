<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Building2, Plus, ArrowLeft } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Organizations — Staggers</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
	<div class="mb-6 flex items-center justify-between">
		<Button href="/app/websites" variant="ghost" size="sm" class="gap-1 pl-0">
			<ArrowLeft class="size-4" />
			Back to websites
		</Button>
		<Button href="/app/organizations/new" size="sm" class="gap-1">
			<Plus class="size-4" />
			New organization
		</Button>
	</div>

	<div class="mb-6">
		<h1 class="text-2xl font-semibold tracking-tight">Organizations</h1>
		<p class="text-muted-foreground">Manage the organizations you belong to.</p>
	</div>

	{#if data.organizations.length === 0}
		<Card>
			<CardContent class="flex flex-col items-center justify-center gap-4 py-12">
				<Building2 class="size-10 text-muted-foreground" />
				<div class="text-center">
					<p class="font-medium">No organizations yet</p>
					<p class="text-sm text-muted-foreground">Create your first organization to get started.</p>
				</div>
				<Button href="/app/organizations/new">Create organization</Button>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-4">
			{#each data.organizations as org}
				<Card>
					<CardHeader class="pb-3">
						<CardTitle class="flex items-center gap-2 text-lg">
							<Building2 class="size-5 text-primary" />
							{org.name}
						</CardTitle>
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
