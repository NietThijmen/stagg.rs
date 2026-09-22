<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { ArrowRight, Shield, Globe, BarChart3, Server } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Staggers — Server-side GTM hosting</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<header class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="container flex h-14 items-center justify-between">
			<div class="flex items-center gap-2 font-semibold">
				<Server class="size-5 text-primary" />
				<span>Staggers</span>
				<Badge variant="secondary" class="hidden text-xs sm:inline-flex">Beta</Badge>
			</div>
			<nav class="flex items-center gap-4">
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
		<section class="container flex flex-col items-center gap-6 py-24 text-center md:py-32">
			<Badge variant="outline" class="rounded-full px-3 py-1 text-sm">
				Server-side Google Tag Manager hosting
			</Badge>
			<h1 class="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
				Own your data pipeline.<br />
				<span class="text-muted-foreground">Without the infrastructure headache.</span>
			</h1>
			<p class="max-w-xl text-lg text-muted-foreground">
				Staggers deploys sGTM containers on your Kubernetes cluster, routes traffic through Envoy,
				and streams analytics into ClickHouse — all managed from one dashboard.
			</p>
			<div class="flex flex-wrap items-center justify-center gap-3">
				{#if data.user}
					<Button href="/app/websites" size="lg">
						Go to dashboard
						<ArrowRight class="size-4" />
					</Button>
				{:else}
					<Button href={data.signInUrl ?? '/sign-in'} size="lg">
						Sign in to dashboard
						<ArrowRight class="size-4" />
					</Button>
					<Button href={data.signUpUrl ?? '/sign-in'} variant="outline" size="lg">
						Create account
					</Button>
				{/if}
			</div>
		</section>

		<Separator />

		<section class="container py-16 md:py-24">
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<Globe class="mb-2 size-8 text-primary" />
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
						<Shield class="mb-2 size-8 text-primary" />
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
						<BarChart3 class="mb-2 size-8 text-primary" />
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
		<div class="container flex items-center justify-between text-sm text-muted-foreground">
			<span>© Staggers</span>
			<span>Built with SvelteKit & shadcn-svelte</span>
		</div>
	</footer>
</div>
