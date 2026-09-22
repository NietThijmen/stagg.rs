<script lang="ts">
  export let data;
</script>

<h1>Staggers</h1>

{#if data.user}
  <p>Welcome, {data.user.email}.</p>
  <a href="/app/websites">Go to dashboard</a>
{:else}
  <p>Server-side Google Tag Manager hosting.</p>
  <a href="/app/websites">Sign in</a>
{/if}
