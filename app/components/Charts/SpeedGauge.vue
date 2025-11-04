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

const props = defineProps<{ currentSpeed: number }>();

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

const option = computed(() => {
	const text = isDark.value ? '#e5e7eb' : '#111827';
	return {
		backgroundColor: 'transparent',
		textStyle: { color: text },
		animationDuration: 400,
		series: [
			{
				type: 'gauge',
				min: 0,
				max: 140,
				splitNumber: 7,
				center: ['50%', '55%'],
				radius: '95%',
				axisLine: {
					lineStyle: {
						width: 14,
						color: [
							[0.5, '#10b981'],
							[0.8, '#f59e0b'],
							[1, '#ef4444'],
						],
					},
				},
				axisTick: { distance: -16, length: 6 },
				splitLine: { distance: -16, length: 12, lineStyle: { width: 2 } },
				axisLabel: { distance: 12, color: text },
				pointer: { width: 4 },
				anchor: { show: true, size: 10 },
				detail: {
					formatter: (value: number) => `{val|${value.toFixed(0)}} {unit|km/h}`,
					offsetCenter: [0, '70%'],
					rich: {
						val: { fontSize: 50, color: text, fontWeight: 800 },
						unit: { fontSize: 50, color: text, fontWeight: 400 },
					},
				},
				progress: { show: true, width: 14 },
				itemStyle: { color: '#60a5fa' },
				data: [
					{
						value: Math.max(
							0,
							Math.min(
								140,
								Number.isFinite(props.currentSpeed)
									? Number(props.currentSpeed.toFixed(1))
									: 0
							)
						),
					},
				],
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
