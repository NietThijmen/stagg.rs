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
	import { AlertCircle, ArrowLeft, Building2, CheckCircle2, Mail, UserPlus } from '@lucide/svelte';
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

<div class="mx-auto max-w-3xl">
	<div class="mb-6">
		<Button href="/app/organizations" variant="ghost" size="sm" class="gap-1 pl-0">
			<ArrowLeft class="size-4" />
			Back to organizations
		</Button>
	</div>

	<div class="mb-6">
		<h1 class="flex items-center gap-2 text-2xl font-semibold tracking-tight">
			<Building2 class="size-6 text-primary" />
			{data.organization.name}
		</h1>
		<p class="text-muted-foreground">Manage members and pending invitations.</p>
	</div>

	<div class="flex flex-col gap-6">
		<Card>
			<CardHeader>
				<CardTitle class="text-lg">Members</CardTitle>
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
									<TableCell>{member.user.email}</TableCell>
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
				<CardTitle class="text-lg">Pending invitations</CardTitle>
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
									<TableCell>{new Date(invitation.expiresAt).toLocaleDateString()}</TableCell>
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
					<CardTitle class="flex items-center gap-2 text-lg">
						<UserPlus class="size-5 text-primary" />
						Invite member
					</CardTitle>
					<CardDescription>
						Send an email invitation to join this organization.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form method="POST" action="?/invite" use:enhance class="flex flex-col gap-5">
						{#if form?.error}
							<div class="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
								<AlertCircle class="size-4 shrink-0" />
								{form.error}
							</div>
						{/if}

						{#if form?.success}
							<div class="flex items-center gap-2 rounded-md bg-emerald-100 p-3 text-sm text-emerald-800">
								<CheckCircle2 class="size-4 shrink-0" />
								Invitation sent successfully.
							</div>
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
</div>
