<nav>
  <a href="/app/websites">Websites</a>
  <a href="/app/websites/new">New website</a>
</nav>

<main>
  <slot />
</main>

<style>
  nav {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border-bottom: 1px solid #ddd;
  }
  main {
    padding: 1rem;
  }
</style>
