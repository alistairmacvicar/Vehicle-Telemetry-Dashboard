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
import { toEchartsData, timeAxis, baseTooltip, dataZoom } from '~/lib/util/echarts';

const props = defineProps<{ lightsSeries: DataRecord[] }>();

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
		yAxis: {
			type: 'value',
			min: 0,
			max: 1,
			axisLabel: { show: false },
			splitLine: { show: false },
		},
		tooltip: baseTooltip(isDark.value),
		dataZoom: dataZoom(isDark.value),
		series: [
			{
				name: 'Emergency Lights',
				type: 'line',
				step: 'end',
				showSymbol: false,
				lineStyle: { width: 2, color: '#f43f5e' },
				areaStyle: { color: 'rgba(244,63,94,0.25)' },
				data: toEchartsData(props.lightsSeries),
				markPoint: {
					symbolSize: 28,
					itemStyle: { color: '#f43f5e' },
					data: [{ type: 'max', name: 'ON' }],
					label: { color: '#fff' },
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


