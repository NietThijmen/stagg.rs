<script lang="ts">
	interface LinePoint {
		label: string;
		value: number;
	}

	let {
		data,
		height = 120,
		formatValue = (value: number) => String(value)
	}: {
		data: LinePoint[];
		height?: number;
		formatValue?: (value: number) => string;
	} = $props();

	const width = 600;
	const padding = 8;
	const gridLines = [0.25, 0.5, 0.75, 1];

	const max = $derived(Math.max(1, ...data.map((point) => point.value)));

	const points = $derived(
		data.map((point, index) => {
			const x =
				data.length <= 1 ? width / 2 : padding + (index / (data.length - 1)) * (width - padding * 2);
			const y = height - padding - (point.value / max) * (height - padding * 2);
			return { ...point, x, y };
		})
	);

	const linePath = $derived(
		points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
	);

	const areaPath = $derived(
		points.length
			? `${linePath} L${points[points.length - 1].x.toFixed(1)},${height - padding} L${points[0].x.toFixed(1)},${height - padding} Z`
			: ''
	);
</script>

<svg viewBox={`0 0 ${width} ${height}`} class="w-full" role="img">
	{#each gridLines as fraction}
		{@const y = height - padding - fraction * (height - padding * 2)}
		<line
			x1={padding}
			x2={width - padding}
			y1={y}
			y2={y}
			stroke="currentColor"
			stroke-width="1"
			stroke-dasharray="4 4"
			class="text-foreground/10"
			vector-effect="non-scaling-stroke"
		/>
	{/each}
	{#if areaPath}
		<path d={areaPath} class="text-foreground/5" fill="currentColor" />
	{/if}
	{#if linePath}
		<path
			d={linePath}
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="text-foreground/80"
			vector-effect="non-scaling-stroke"
		/>
	{/if}
	{#each points as point}
		<circle cx={point.x} cy={point.y} r="2.5" class="text-foreground/80" fill="currentColor">
			<title>{point.label}: {formatValue(point.value)}</title>
		</circle>
	{/each}
</svg>
