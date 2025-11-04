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

const props = defineProps<{
	fuelSeries: DataRecord[];
	consumptionSeries: DataRecord[];
}>();

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

const option = computed(() => {
	const text = isDark.value ? '#e5e7eb' : '#111827';
	return {
		backgroundColor: 'transparent',
		textStyle: { color: text },
		animationDuration: 600,
		animationEasing: 'quarticOut',
		grid: { left: 40, right: 48, top: 8, bottom: 48, containLabel: true },
		legend: { top: 0, textStyle: { color: text } },
		xAxis: timeAxis(isDark.value, { format: 'hm', splitNumber: 6 }),
		yAxis: [
			{ ...valueAxis(isDark.value, ' %', 0, 100), name: 'Fuel Level' },
			{ ...valueAxis(isDark.value, ' L/100km', 0, 30), name: 'Consumption' },
		],
		tooltip: baseTooltip(isDark.value),
		dataZoom: dataZoom(isDark.value),
		series: [
			{
				name: 'Fuel Level',
				type: 'line',
				smooth: true,
				showSymbol: false,
				areaStyle: {
					opacity: 0.18,
					color: {
						type: 'linear',
						x: 0, y: 0, x2: 0, y2: 1,
						colorStops: [
							{ offset: 0, color: '#60a5fa' },
							{ offset: 1, color: 'rgba(96,165,250,0.05)' },
						],
					},
				},
				lineStyle: { width: 2.5, color: '#60a5fa' },
				itemStyle: { color: '#60a5fa' },
				data: toEchartsData(props.fuelSeries),
				yAxisIndex: 0,
			},
			{
				name: 'Fuel Consumption',
				type: 'line',
				smooth: true,
				showSymbol: false,
				lineStyle: { width: 2.5, color: '#f59e0b' },
				itemStyle: { color: '#f59e0b' },
				areaStyle: { opacity: 0.08, color: '#f59e0b' },
				data: toEchartsData(props.consumptionSeries),
				yAxisIndex: 1,
			},
		],
	};
});
</script>

<style scoped>
.chart-root {
	width: 100%;
	height: 100%;
}
.chart {
	width: 100%;
	height: 100%;
}
</style>


