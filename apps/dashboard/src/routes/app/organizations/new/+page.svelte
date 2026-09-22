<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { AlertCircle, ArrowLeft, Building2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<svelte:head>
	<title>New organization — Staggers</title>
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
				<Building2 class="size-5 text-primary" />
				Create organization
			</CardTitle>
			<CardDescription>
				Create a new organization to group websites and team members.
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
					<Input id="name" name="name" placeholder="Acme Inc." required />
				</div>

				<div class="flex justify-end gap-3 pt-2">
					<Button href="/app/websites" variant="outline" type="button">Cancel</Button>
					<Button type="submit">Create organization</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
