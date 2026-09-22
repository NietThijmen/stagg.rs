<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuTrigger,
	} from '$lib/components/ui/dropdown-menu';
	import {
		Sheet,
		SheetClose,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetTrigger,
	} from '$lib/components/ui/sheet';
	import { Plus, Menu, LogOut, Server, LayoutDashboard, Globe, Building2 } from '@lucide/svelte';

	let { data, children } = $props();

	const userInitials = $derived(() => {
		const u = data.user;
		if (!u) return '?';
		const first = ('firstName' in u && u.firstName?.[0]) || u.email[0].toUpperCase();
		const last = 'lastName' in u && u.lastName?.[0];
		return last ? `${first}${last}`.toUpperCase() : first.toUpperCase();
	});

	const displayName = $derived(() => {
		const u = data.user;
		if (!u) return 'Guest';
		if ('firstName' in u && u.firstName) return `${u.firstName} ${u.lastName ?? ''}`.trim();
		return u.email;
	});

	const nav = [
		{ href: '/app/websites', label: 'Websites', icon: Globe },
		{ href: '/app/websites/new', label: 'New website', icon: Plus },
		{ href: '/app/organizations', label: 'Organizations', icon: Building2 },
		{ href: '/app/organizations/new', label: 'New organization', icon: Plus },
	];
</script>

<div class="flex min-h-screen flex-col">
	<header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="container flex h-14 items-center justify-between gap-4">
			<div class="flex items-center gap-4">
				<Sheet>
					<SheetTrigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="icon" class="md:hidden">
								<Menu class="size-5" />
								<span class="sr-only">Toggle menu</span>
							</Button>
						{/snippet}
					</SheetTrigger>
					<SheetContent side="left" class="w-64">
						<SheetHeader>
							<SheetTitle class="flex items-center gap-2">
								<Server class="size-5 text-primary" />
								Staggers
							</SheetTitle>
						</SheetHeader>
						<nav class="mt-6 flex flex-col gap-2">
							{#each nav as item}
								{@const Icon = item.icon}
								<SheetClose>
									{#snippet child({ props })}
										<Button
											{...props}
											href={item.href}
											variant={page.url.pathname === item.href ? 'secondary' : 'ghost'}
											class="w-full justify-start"
										>
											<Icon class="size-4" />
											{item.label}
										</Button>
									{/snippet}
								</SheetClose>
							{/each}
						</nav>
					</SheetContent>
				</Sheet>

				<a href="/app/websites" class="flex items-center gap-2 font-semibold">
					<Server class="size-5 text-primary" />
					<span class="hidden sm:inline">Staggers</span>
				</a>

				<nav class="hidden items-center gap-1 md:flex">
					{#each nav as item}
						{@const Icon = item.icon}
						<Button
							href={item.href}
							variant={page.url.pathname === item.href ? 'secondary' : 'ghost'}
							size="sm"
							class="gap-1.5"
						>
							<Icon class="size-4" />
							{item.label}
						</Button>
					{/each}
				</nav>
			</div>

			<div class="flex items-center gap-3">
				<DropdownMenu>
					<DropdownMenuTrigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" class="gap-2 px-2">
								<Avatar class="size-8">
									<AvatarImage src={data.user?.profilePictureUrl ?? ''} alt={displayName()} />
									<AvatarFallback>{userInitials()}</AvatarFallback>
								</Avatar>
								<span class="hidden max-w-[120px] truncate text-sm font-normal sm:inline">
									{displayName()}
								</span>
							</Button>
						{/snippet}
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" class="w-56">
						<DropdownMenuLabel class="font-normal">
							<div class="flex flex-col gap-1">
								<span class="font-medium">{displayName()}</span>
								<span class="text-xs text-muted-foreground">{data.user?.email}</span>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							{#snippet child({ props })}
								<a {...props} href="/app/websites" class="flex items-center">
									<LayoutDashboard class="mr-2 size-4" />
									Dashboard
								</a>
							{/snippet}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem class="p-0">
							<form method="POST" action="/app?/signOut" class="w-full">
								<Button type="submit" variant="ghost" class="w-full justify-start">
									<LogOut class="mr-2 size-4" />
									Sign out
								</Button>
							</form>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	</header>

	<main class="flex-1">
		<div class="container py-6">
			{@render children()}
		</div>
	</main>
</div>
