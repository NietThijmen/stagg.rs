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
	import { Menu, LogOut, LayoutDashboard, Globe, Building2 } from '@lucide/svelte';

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
		{ href: '/app/organizations', label: 'Organizations', icon: Building2 },
	];

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<div class="flex min-h-screen flex-col">
	<header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
		<div class="mx-auto w-full max-w-5xl px-6">
			<div class="flex h-12 items-center justify-between gap-4">
				<div class="flex items-center gap-3">
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
									<span class="size-4 rounded-sm border-2 border-foreground"></span>
									Staggers
								</SheetTitle>
							</SheetHeader>
							<nav class="mt-6 flex flex-col gap-1">
								{#each nav as item}
									{@const Icon = item.icon}
									<SheetClose>
										{#snippet child({ props })}
											<Button
												{...props}
												href={item.href}
												variant={isActive(item.href) ? 'secondary' : 'ghost'}
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

					<a href="/app/websites" class="flex items-center gap-2.5">
						<span class="size-4 rounded-sm border-2 border-foreground"></span>
						<span class="text-sm font-semibold tracking-tight">Staggers</span>
					</a>
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" class="gap-2 px-2">
								<Avatar class="size-6">
									<AvatarImage src={data.user?.profilePictureUrl ?? ''} alt={displayName()} />
									<AvatarFallback class="text-xs">{userInitials()}</AvatarFallback>
								</Avatar>
								<span class="hidden max-w-[160px] truncate text-xs font-normal text-muted-foreground sm:inline">
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
								<a {...props} href="/app/websites">
									<LayoutDashboard class="block size-4" />
									Dashboard
								</a>
							{/snippet}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<form method="POST" action="/app?/signOut">
							<DropdownMenuItem>
								{#snippet child({ props })}
									<button {...props} type="submit">
										<LogOut class="block size-4" />
										Sign out
									</button>
								{/snippet}
							</DropdownMenuItem>
						</form>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<nav class="hidden items-center gap-6 md:flex">
				{#each nav as item}
					<a
						href={item.href}
						class="-mb-px border-b-2 py-2.5 text-sm font-medium transition-colors {isActive(item.href)
							? 'border-foreground text-foreground'
							: 'border-transparent text-muted-foreground hover:text-foreground'}"
					>
						{item.label}
					</a>
				{/each}
			</nav>
		</div>
	</header>

	<main class="flex-1">
		<div class="mx-auto w-full max-w-5xl px-6 py-10">
			{@render children()}
		</div>
	</main>
</div>
