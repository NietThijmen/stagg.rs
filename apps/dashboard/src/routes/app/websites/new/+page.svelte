<script lang="ts">
  export let form;
  export let data;
</script>

<h1>Add website</h1>

{#if form?.error}
  <p style="color: red">{form.error}</p>
{/if}

<form method="POST">
  <label>
    Name
    <input name="name" required />
  </label>

  <label>
    Hostname
    <input name="hostname" placeholder="metrics.customer.nl" required />
  </label>

  <label>
    Organization
    <select name="organizationId" required>
      {#each data.organizations as org}
        <option value={org.id}>{org.name}</option>
      {/each}
    </select>
  </label>

  <button type="submit">Create</button>
</form>

<style>
  label {
    display: block;
    margin: 0.75rem 0;
  }
</style>
