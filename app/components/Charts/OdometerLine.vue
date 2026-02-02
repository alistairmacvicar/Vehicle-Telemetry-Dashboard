<template>
	<div class="chart-root">
		<VChart :option="option" autoresize class="chart" />
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DataRecord } from '~~/shared/types/data';
import { toEchartsData, timeAxis, valueAxis, baseTooltip, dataZoom } from '~/lib/util/echarts';

const props = defineProps<{ odometerSeries: DataRecord[] }>();

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

const option = computed(() => {
	const text = isDark.value ? '#e5e7eb' : '#111827';
	const series = props.odometerSeries || [];
	const base = series.length ? series[0].y : 0;
	const deltas = series.map((d) => Math.abs(d.y - base));
	const deltaMax = deltas.length ? Math.max(...deltas) : 1;
	const pad = 1;
	const yMin = Math.floor(base - deltaMax - pad);
	const yMax = Math.ceil(base + deltaMax + pad);
	return {
		backgroundColor: 'transparent',
		textStyle: { color: text },
		animationDuration: 600,
		animationEasing: 'quarticOut',
		grid: { left: 40, right: 24, top: 8, bottom: 48, containLabel: true },
		legend: { show: false },
		xAxis: timeAxis(isDark.value, { format: 'hm', splitNumber: 6 }),
		yAxis: valueAxis(isDark.value, ' km', yMin, yMax, 1),
		tooltip: baseTooltip(isDark.value),
		dataZoom: dataZoom(isDark.value),
		series: [
			{
				name: 'Odometer',
				type: 'line',
				smooth: true,
				showSymbol: false,
				lineStyle: { width: 2.5, color: '#3b82f6' },
				itemStyle: { color: '#3b82f6' },
				areaStyle: { opacity: 0.08, color: '#3b82f6' },
				data: toEchartsData(series),
			},
		],
	};
});
</script>

<style scoped>
.chart-root { width: 100%; height: 100%; }
.chart { width: 100%; height: 100%; }
</style>


