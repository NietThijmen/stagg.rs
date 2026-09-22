<script lang="ts">
	interface BarPoint {
		label: string;
		value: number;
		error?: number;
	}

	let {
		data,
		height = 160,
		formatValue = (value: number) => String(value)
	}: {
		data: BarPoint[];
		height?: number;
		formatValue?: (value: number) => string;
	} = $props();

	const width = 600;
	const padding = 8;
	const gridLines = [0.25, 0.5, 0.75, 1];

	const max = $derived(Math.max(1, ...data.map((point) => point.value)));
	const slot = $derived(data.length ? (width - padding * 2) / data.length : 0);
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
	{#each data as point, index}
		{@const barHeight = (point.value / max) * (height - padding * 2)}
		{@const errorHeight = ((point.error ?? 0) / max) * (height - padding * 2)}
		{@const x = padding + index * slot}
		<rect
			x={x}
			y={height - padding - barHeight}
			width={Math.max(slot - 1, 1)}
			height={barHeight}
			class="text-foreground/60"
			fill="currentColor"
		>
			<title>{point.label}: {formatValue(point.value)}</title>
		</rect>
		{#if errorHeight > 0}
			<rect
				x={x}
				y={height - padding - errorHeight}
				width={Math.max(slot - 1, 1)}
				height={errorHeight}
				class="text-destructive"
				fill="currentColor"
			>
				<title>{point.label}: {point.error} errors</title>
			</rect>
		{/if}
	{/each}
</svg>
