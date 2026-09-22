<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ArrowRight, Shield, Globe, BarChart3 } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Staggers — Server-side GTM hosting</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<header class="border-b">
		<div class="mx-auto flex h-12 w-full max-w-5xl items-center justify-between px-6">
			<div class="flex items-center gap-2.5">
				<span class="size-4 rounded-sm border-2 border-foreground"></span>
				<span class="text-sm font-semibold tracking-tight">Staggers</span>
			</div>
			<nav class="flex items-center gap-2">
				{#if data.user}
					<Button href="/app/websites" size="sm">Dashboard</Button>
				{:else}
					<Button href="/sign-in" variant="ghost" size="sm">Sign in</Button>
					<Button href="/sign-in" size="sm">Get started</Button>
				{/if}
			</nav>
		</div>
	</header>

	<main class="flex-1">
		<section class="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 py-28 text-center">
			<span class="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
				Server-side Google Tag Manager hosting
			</span>
			<h1 class="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
				Own your data pipeline.<br />
				<span class="text-muted-foreground">Without the infrastructure headache.</span>
			</h1>
			<p class="max-w-xl text-muted-foreground">
				Staggers deploys sGTM containers on your Kubernetes cluster, routes traffic through Envoy,
				and streams analytics into ClickHouse — all managed from one dashboard.
			</p>
			<div class="flex flex-wrap items-center justify-center gap-3">
				{#if data.user}
					<Button href="/app/websites">
						Go to dashboard
						<ArrowRight class="size-4" />
					</Button>
				{:else}
					<Button href={data.signInUrl ?? '/sign-in'}>
						Sign in to dashboard
						<ArrowRight class="size-4" />
					</Button>
					<Button href={data.signUpUrl ?? '/sign-in'} variant="outline">
						Create account
					</Button>
				{/if}
			</div>
		</section>

		<section class="mx-auto w-full max-w-5xl px-6 pb-24">
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<Globe class="mb-2 size-5 text-muted-foreground" />
						<CardTitle>Per-site sGTM containers</CardTitle>
						<CardDescription>
							Provision isolated server-side GTM containers for every site from the dashboard.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p class="text-sm text-muted-foreground">
							Map custom hostnames, preview hostnames, and CNAME records automatically.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<Shield class="mb-2 size-5 text-muted-foreground" />
						<CardTitle>Envoy ingress & egress</CardTitle>
						<CardDescription>
							Route traffic securely through Envoy Gateway with fine-grained egress controls.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p class="text-sm text-muted-foreground">
							Define allowed downstream destinations and keep analytics data under your control.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<BarChart3 class="mb-2 size-5 text-muted-foreground" />
						<CardTitle>ClickHouse observability</CardTitle>
						<CardDescription>
							Stream OTEL traces, logs, and metrics into ClickHouse for real-time analytics.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p class="text-sm text-muted-foreground">
							Build dashboards and trace requests from edge to destination.
						</p>
					</CardContent>
				</Card>
			</div>
		</section>
	</main>

	<footer class="border-t py-6">
		<div class="mx-auto flex w-full max-w-5xl items-center justify-between px-6 text-xs text-muted-foreground">
			<span>© Staggers</span>
			<span>Server-side GTM hosting</span>
		</div>
	</footer>
</div>
