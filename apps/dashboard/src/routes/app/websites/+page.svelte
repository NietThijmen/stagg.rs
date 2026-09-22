<script lang="ts">
  export let data;
</script>

<h1>Websites</h1>

<a href="/app/websites/new">Add website</a>

{#if data.sites.length === 0}
  <p>No websites yet.</p>
{:else}
  <ul>
    {#each data.sites as site}
      <li>
        <a href={`/app/websites/${site.id}`}>
          {site.name} — {site.hostname} — {site.status}
        </a>
      </li>
    {/each}
  </ul>
{/if}
