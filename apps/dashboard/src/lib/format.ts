export function formatNumber(value: number) {
	return new Intl.NumberFormat('en-US').format(value);
}

export function formatPercent(value: number) {
	return `${(value * 100).toFixed(1)}%`;
}

export function formatDuration(value: number) {
	return `${Math.round(value)} ms`;
}

export function formatDate(date: Date | string | null) {
	if (!date) return '—';
	return new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(date));
}

export function formatTimestamp(date: string) {
	return new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'medium'
	}).format(new Date(`${date.replace(' ', 'T')}Z`));
}

export function formatBucket(bucket: string) {
	const date = new Date(`${bucket.replace(' ', 'T')}Z`);
	return Number.isNaN(date.getTime())
		? bucket
		: date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
}
