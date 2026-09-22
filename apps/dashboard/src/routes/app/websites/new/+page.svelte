<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
	} from '$lib/components/ui/select';
	import { AlertCircle, ArrowLeft, Globe } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let selectedOrg = $state('');

	const selectedOrgLabel = $derived(
		data.organizations.find((o) => o.id === selectedOrg)?.name ?? 'Select an organization'
	);
</script>

<svelte:head>
	<title>New website — Staggers</title>
</svelte:head>

<div class="mx-auto max-w-xl">
	<div class="mb-6">
		<Button href="/app/websites" variant="ghost" size="sm" class="gap-1 pl-0">
			<ArrowLeft class="size-4" />
			Back to websites
		</Button>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Globe class="size-5 text-primary" />
				Add website
			</CardTitle>
			<CardDescription>
				Create a new server-side GTM site and start the provisioning pipeline.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" use:enhance class="flex flex-col gap-5">
				{#if form?.error}
					<div class="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
						<AlertCircle class="size-4 shrink-0" />
						{form.error}
					</div>
				{/if}

				<div class="flex flex-col gap-2">
					<Label for="name">Name</Label>
					<Input id="name" name="name" placeholder="Customer analytics" required />
				</div>

				<div class="flex flex-col gap-2">
					<Label for="hostname">Hostname</Label>
					<Input
						id="hostname"
						name="hostname"
						placeholder="metrics.customer.nl"
						required
						type="text"
						dir="ltr"
					/>
					<p class="text-xs text-muted-foreground">
						The public hostname that will serve your sGTM container.
					</p>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="organizationId">Organization</Label>
					<Select type="single" name="organizationId" bind:value={selectedOrg}>
						<SelectTrigger id="organizationId">
							{selectedOrgLabel}
						</SelectTrigger>
						<SelectContent>
							{#each data.organizations as org}
								<SelectItem value={org.id}>{org.name}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>

				<div class="flex justify-end gap-3 pt-2">
					<Button href="/app/websites" variant="outline" type="button">Cancel</Button>
					<Button type="submit">Create website</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
