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
	import BackButton from '$lib/components/back-button.svelte';
	import FormAlert from '$lib/components/form-alert.svelte';
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

<div class="mx-auto flex max-w-xl flex-col gap-6">
	<BackButton href="/app/websites" label="Back to websites" />

	<Card>
		<CardHeader>
			<CardTitle>Add website</CardTitle>
			<CardDescription>
				Create a new server-side GTM site and start the provisioning pipeline.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" use:enhance class="flex flex-col gap-5">
				{#if form?.error}
					<FormAlert variant="error" message={form.error} />
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
					<Label for="containerConfig">Container config</Label>
					<textarea
						id="containerConfig"
						name="containerConfig"
						required
						rows="6"
						dir="ltr"
						placeholder="Paste the GTM server container config JSON"
						class="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 font-mono text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm"
					></textarea>
					<p class="text-xs text-muted-foreground">
						Paste the server container config from your GTM container.
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
