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

const props = defineProps<{ fuelSeries: DataRecord[] }>();

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
		legend: { show: false },
		xAxis: timeAxis(isDark.value, { format: 'hm', splitNumber: 6 }),
		yAxis: valueAxis(isDark.value, '%', 0, 100),
		tooltip: baseTooltip(isDark.value),
		dataZoom: dataZoom(isDark.value),
		series: [
			{
				name: 'Fuel Level',
				type: 'line',
				smooth: true,
				showSymbol: false,
				areaStyle: {
					opacity: 0.25,
					color: {
						type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
						colorStops: [
							{ offset: 0, color: '#34d399' },
							{ offset: 1, color: 'rgba(52,211,153,0.05)' },
						],
					},
				},
				lineStyle: { width: 2.5, color: '#34d399' },
				itemStyle: { color: '#34d399' },
				data: toEchartsData(props.fuelSeries),
				markLine: {
					label: { color: text },
					lineStyle: { color: '#f43f5e', type: 'dashed', width: 1.5 },
					data: [
						{ yAxis: 25, name: 'Low Fuel' },
						{ yAxis: 10, name: 'Critical' },
					],
				},
			},
		],
	};
});
</script>

<style scoped>
.chart-root { width: 100%; height: 100%; }
.chart { width: 100%; height: 100%; }
</style>


