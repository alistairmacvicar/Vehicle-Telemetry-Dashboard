import type { DataRecord } from '~~/shared/types/data';

export function toEchartsData(series: DataRecord[] | undefined) {
	return (series || []).map((d) => [d.x, d.y]);
}

type TimeAxisOptions = {
	format?: 'hm' | 'hms';
	splitNumber?: number;
};

export function timeAxis(isDark: boolean, opts: TimeAxisOptions = {}) {
	const { format = 'hm', splitNumber = 6 } = opts;
	return {
		type: 'time',
		splitNumber,
		axisLabel: {
			color: isDark ? '#e5e7eb' : '#111827',
			hideOverlap: true,
			formatter: (value: number) => {
				const d = new Date(value);
				const pad = (n: number) => String(n).padStart(2, '0');
				const hh = pad(d.getHours());
				const mm = pad(d.getMinutes());
				if (format === 'hms') {
					const ss = pad(d.getSeconds());
					return `${hh}:${mm}:${ss}`;
				}
				return `${hh}:${mm}`;
			},
		},
		splitLine: { show: false },
	};
}

export function valueAxis(
	isDark: boolean,
	unit?: string,
	min?: number,
	max?: number,
	minInterval?: number
) {
	return {
		type: 'value',
		min: min ?? 'dataMin',
		max: max ?? 'dataMax',
		minInterval,
		axisLabel: {
			color: isDark ? '#e5e7eb' : '#111827',
			formatter: (val: number) => (unit ? `${val}${unit}` : `${val}`),
		},
		splitLine: {
			lineStyle: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
		},
	};
}

export function baseTooltip(isDark: boolean) {
	return {
		trigger: 'axis',
		axisPointer: { type: 'cross' },
		order: 'valueDesc' as const,
		backgroundColor: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)',
		textStyle: { color: isDark ? '#e5e7eb' : '#111827' },
		borderColor: isDark ? 'rgba(55,65,81,0.7)' : 'rgba(209,213,219,0.7)',
		borderWidth: 1,
		padding: 10,
		confine: true,
	};
}

export function dataZoom(isDark: boolean) {
	return [
		{ type: 'slider', realtime: true, height: 20, bottom: 8, textStyle: { color: isDark ? '#e5e7eb' : '#111827' } },
		{ type: 'inside', realtime: true },
	];
}


