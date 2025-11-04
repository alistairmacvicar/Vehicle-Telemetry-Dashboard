import { defineNuxtPlugin } from '#app';
import ECharts from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import {
	GridComponent,
	TooltipComponent,
	LegendComponent,
	DataZoomComponent,
	VisualMapComponent,
	TitleComponent,
	ToolboxComponent,
	MarkLineComponent,
	MarkPointComponent,
} from 'echarts/components';
import {
	LineChart,
	BarChart,
	GaugeChart,
	ScatterChart,
	PieChart,
} from 'echarts/charts';

use([
	CanvasRenderer,
	// components
	GridComponent,
	TooltipComponent,
	LegendComponent,
	DataZoomComponent,
	VisualMapComponent,
	TitleComponent,
	ToolboxComponent,
	MarkLineComponent,
	MarkPointComponent,
	// charts
	LineChart,
	BarChart,
	GaugeChart,
	ScatterChart,
	PieChart,
]);

export default defineNuxtPlugin((nuxtApp) => {
	nuxtApp.vueApp.component('VChart', ECharts);
});


