<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table';
	import BackButton from '$lib/components/back-button.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import FormAlert from '$lib/components/form-alert.svelte';
	import { Mail } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	function formatRole(role: string) {
		return role
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
</script>

<svelte:head>
	<title>{data.organization.name} — Staggers</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<BackButton href="/app/organizations" label="Back to organizations" />

	<PageHeader title={data.organization.name} description="Manage members and pending invitations." />

	<Card>
		<CardHeader>
			<CardTitle>Members</CardTitle>
			<CardDescription>People who currently have access.</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.members.length === 0}
				<p class="text-sm text-muted-foreground">No members found.</p>
			{:else}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.members as member}
							<TableRow>
								<TableCell>{member.user.name ?? '—'}</TableCell>
								<TableCell class="text-muted-foreground">{member.user.email}</TableCell>
								<TableCell>{formatRole(member.role)}</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Pending invitations</CardTitle>
			<CardDescription>Invites waiting to be accepted.</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.invitations.length === 0}
				<p class="text-sm text-muted-foreground">No pending invitations.</p>
			{:else}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Email</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Expires</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.invitations as invitation}
							<TableRow>
								<TableCell>{invitation.email}</TableCell>
								<TableCell class="capitalize">{invitation.state}</TableCell>
								<TableCell class="text-muted-foreground">
									{new Date(invitation.expiresAt).toLocaleDateString()}
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</CardContent>
	</Card>

	{#if data.isAdmin}
		<Card>
			<CardHeader>
				<CardTitle>Invite member</CardTitle>
				<CardDescription>
					Send an email invitation to join this organization.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form method="POST" action="?/invite" use:enhance class="flex flex-col gap-5">
					{#if form?.error}
						<FormAlert variant="error" message={form.error} />
					{/if}

					{#if form?.success}
						<FormAlert variant="success" message="Invitation sent successfully." />
					{/if}

					<div class="flex flex-col gap-2">
						<Label for="email">Email address</Label>
						<Input id="email" name="email" type="email" placeholder="colleague@example.com" required />
					</div>

					<div class="flex justify-end gap-3 pt-2">
						<Button type="submit">
							<Mail class="mr-2 size-4" />
							Send invitation
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	{/if}
</div>
