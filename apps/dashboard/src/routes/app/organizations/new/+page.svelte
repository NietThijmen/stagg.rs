<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import BackButton from '$lib/components/back-button.svelte';
	import FormAlert from '$lib/components/form-alert.svelte';
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<svelte:head>
	<title>New organization — Staggers</title>
</svelte:head>

<div class="mx-auto flex max-w-xl flex-col gap-6">
	<BackButton href="/app/organizations" label="Back to organizations" />

	<Card>
		<CardHeader>
			<CardTitle>Create organization</CardTitle>
			<CardDescription>
				Create a new organization to group websites and team members.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" use:enhance class="flex flex-col gap-5">
				{#if form?.error}
					<FormAlert variant="error" message={form.error} />
				{/if}

				<div class="flex flex-col gap-2">
					<Label for="name">Name</Label>
					<Input id="name" name="name" placeholder="Acme Inc." required />
				</div>

				<div class="flex justify-end gap-3 pt-2">
					<Button href="/app/organizations" variant="outline" type="button">Cancel</Button>
					<Button type="submit">Create organization</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
