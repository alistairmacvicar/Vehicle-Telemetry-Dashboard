<template>
	<div class="chart-root">
		<VChart
			:option="option"
			autoresize
			class="chart"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DataRecord } from '~~/shared/types/data';
import { toEchartsData, timeAxis, valueAxis, baseTooltip, dataZoom } from '~/lib/util/echarts';

const props = defineProps<{ oilSeries: DataRecord[]; coolantSeries: DataRecord[] }>();

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

const option = computed(() => {
	const text = isDark.value ? '#e5e7eb' : '#111827';
	return {
		backgroundColor: 'transparent',
		textStyle: { color: text },
		animationDuration: 600,
		animationEasing: 'quarticOut',
		grid: { left: 40, right: 24, top: 8, bottom: 48, containLabel: true },
		legend: { top: 0, textStyle: { color: text } },
		xAxis: timeAxis(isDark.value, { format: 'hm', splitNumber: 6 }),
		yAxis: valueAxis(isDark.value, ' °C', 60, 120),
		tooltip: baseTooltip(isDark.value),
		dataZoom: dataZoom(isDark.value),
		visualMap: {
			show: false,
			pieces: [
				{ gt: 0, lte: 95, color: '#10b981' },
				{ gt: 95, lte: 105, color: '#f59e0b' },
				{ gt: 105, color: '#ef4444' },
			],
		},
		series: [
			{
				name: 'Oil Temp',
				type: 'line',
				smooth: true,
				showSymbol: false,
				lineStyle: { width: 2.5, color: '#f87171' },
				itemStyle: { color: '#f87171' },
				areaStyle: { opacity: 0.06, color: '#f87171' },
				data: toEchartsData(props.oilSeries),
			},
			{
				name: 'Coolant Temp',
				type: 'line',
				smooth: true,
				showSymbol: false,
				lineStyle: { width: 2.5, color: '#60a5fa' },
				itemStyle: { color: '#60a5fa' },
				areaStyle: { opacity: 0.06, color: '#60a5fa' },
				data: toEchartsData(props.coolantSeries),
			},
		],
	};
});
</script>

<style scoped>
.chart-root { width: 100%; height: 100%; }
.chart { width: 100%; height: 100%; }
</style>


