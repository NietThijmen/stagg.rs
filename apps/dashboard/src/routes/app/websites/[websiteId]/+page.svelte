<script lang="ts">
  export let data;
  const site = data.site;
</script>

<h1>{site.name}</h1>

<dl>
  <dt>Hostname</dt>
  <dd>{site.hostname}</dd>

  <dt>Preview hostname</dt>
  <dd>{site.previewHostname}</dd>

  <dt>Status</dt>
  <dd>{site.status}</dd>

  <dt>Container ID</dt>
  <dd>{site.gtmContainerId ?? 'Pending'}</dd>
</dl>

<h2>DNS setup</h2>
<pre>
Record type: CNAME
Name:        {site.hostname}
Target:      edge.saas.example
</pre>

<h2>Website configuration</h2>
<pre>
gtag('config', 'G-XXXXXXXXXX', {'{'}
  server_container_url: 'https://{site.hostname}',
{'}'});
</pre>

<h2>Recent deployments</h2>
<ul>
  {#each site.deployments as deployment}
    <li>{deployment.revision} — {deployment.status} — {deployment.startedAt}</li>
  {/each}
</ul>

<style>
  dt { font-weight: bold; }
  dd { margin-left: 0; margin-bottom: 0.5rem; }
  pre { background: #f5f5f5; padding: 0.75rem; overflow: auto; }
</style>
