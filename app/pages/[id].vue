<template>
	<div class="layout-grid">
		<div class="map-component">
			<UCard class="map-card">
				<TrackerMap :follow-vehicle-id="vehicleId" />
			</UCard>
		</div>
		<UCard class="data-container">
			<div v-if="selectedVehicle">
				<h3>Vehicle {{ selectedVehicle.id }}</h3>
				<p>Speed: {{ selectedVehicle.currentData.speed.toFixed(1) }} km/h</p>
				<p>Fuel: {{ selectedVehicle.currentData.fuelLevel.toFixed(0) }}%</p>
			</div>
		</UCard>
		<UCard class="data-container"> </UCard>
		<UCard class="data-container"> </UCard>
		<UCard class="data-container"> </UCard>

		<UCard class="temp-data-container"> </UCard>
	</div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import type { Vehicle } from '~~/shared/types/vehicle';
import { useVehicles } from '~/composables/useVehicles';
import { telemetryToSeries, booleanSeries } from '~/lib/util/data-to-series';
import type { DataRecord } from '~~/shared/types/data';

const route = useRoute();
const vehicleId = computed(() => String(route.params.id || ''));

const fuelSeries = computed<DataRecord[]>(() =>
	telemetryToSeries(selectedVehicle.value?.historicalData, 'fuelLevel')
);
const coolantSeries = computed<DataRecord[]>(() =>
	telemetryToSeries(selectedVehicle.value?.historicalData, 'engineCoolantTemp')
);
const oilSeries = computed<DataRecord[]>(() =>
	telemetryToSeries(selectedVehicle.value?.historicalData, 'engineOilTemp')
);
const odometerSeries = computed<DataRecord[]>(() =>
	telemetryToSeries(selectedVehicle.value?.historicalData, 'odometer')
);
const consumptionSeries = computed<DataRecord[]>(() =>
	telemetryToSeries(selectedVehicle.value?.historicalData, 'fuelConsumption')
);
const lightsSeries = computed<DataRecord[]>(() =>
	booleanSeries(selectedVehicle.value?.historicalData, 'emergencyLights')
);

const { vehicles, startPolling } = useVehicles();
onMounted(() => {
	startPolling();
});

const selectedVehicle = computed<Vehicle | null>(() => {
	const id = vehicleId.value;
	return (vehicles.value || []).find((v) => v.id === id) || null;
});
</script>

<style scoped>
.layout-grid {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr 1fr;
	grid-template-rows: 1fr 1fr 1fr 1fr;
	height: 100%;
	min-height: 0;
}

.data-container {
	width: 100%;
	background: transparent;
	height: 100%;
	grid-row: span 2;
}

.temp-data-container {
	width: 100%;
	height: 100%;
	grid-row: 3 / 5;
	grid-column: 3 /5;
}

.map-component {
	width: 100%;
	height: 100%;
	grid-column: 3 / 5;
	grid-row: 1 / 3;
}

.map-card {
	width: 100%;
	height: 100%;
}

.map-card :deep(.p-4),
.map-card :deep(.sm\:p-6) {
	height: 100%;
	min-height: 0;
	padding: 0;
}
</style>
