<template>
	<div class="layout-grid">
		<div class="map-component">
			<UCard class="map-card vd-surface-card">
				<TrackerMap :follow-vehicle-id="vehicleId" />
			</UCard>
		</div>
		<UCard class="data-container vd-surface-card">
			<template v-if="selectedVehicle">
				<div class="card-title">
					<UIcon
						name="i-heroicons-bolt-20-solid"
						class="title-icon"
					/>
					Speed
				</div>
				<ChartsSpeedGauge :current-speed="selectedVehicle.currentData.speed" />
			</template>
		</UCard>
		<UCard class="data-container vd-surface-card">
			<div class="card-title">
				<UIcon
					name="i-heroicons-map-20-solid"
					class="title-icon"
				/>
				Odometer Reading
			</div>
			<ChartsOdometerLine :odometer-series="odometerSeries" />
		</UCard>
		<UCard class="data-container vd-surface-card">
			<div class="card-title">
				<UIcon
					name="i-heroicons-fire-20-solid"
					class="title-icon"
				/>
				Engine Temperatures
			</div>
			<ChartsEngineTempsLine
				:oil-series="oilSeries"
				:coolant-series="coolantSeries"
			/>
		</UCard>
		<UCard class="data-container vd-surface-card">
			<div class="card-title">
				<UIcon
					name="i-heroicons-bell-alert-20-solid"
					class="title-icon"
				/>
				Emergency Light Status
			</div>
			<ChartsEmergencyTimeline :lights-series="lightsSeries" />
		</UCard>

		<UCard class="temp-data-container vd-surface-card">
			<div class="card-title">
				<UIcon
					name="i-heroicons-chart-bar-20-solid"
					class="title-icon"
				/>
				Fuel Level & Consumption
			</div>
			<ChartsSpeedConsumptionLine
				:fuel-series="fuelSeries"
				:consumption-series="consumptionSeries"
			/>
		</UCard>
	</div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import type { Vehicle } from '~~/shared/types/vehicle';
import { useVehicles } from '~/composables/useVehicles';
import { telemetryToSeries, booleanSeries } from '~/lib/util/data-to-series';
import type { DataRecord } from '~~/shared/types/data';
import ChartsSpeedGauge from '~/components/Charts/SpeedGauge.vue';
import ChartsEngineTempsLine from '~/components/Charts/EngineTempsLine.vue';
import ChartsSpeedConsumptionLine from '~/components/Charts/SpeedConsumptionLine.vue';
import ChartsEmergencyTimeline from '~/components/Charts/EmergencyTimeline.vue';
import ChartsOdometerLine from '~/components/Charts/OdometerLine.vue';

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
	gap: 1rem;
	padding: 1rem;
}

.card-title {
	font-weight: 600;
	padding: 0.5rem 0.75rem;
	display: flex;
	align-items: center;
	gap: 0.35rem;
}

.title-icon {
	color: #9db6ff;
	filter: drop-shadow(0 0 6px rgba(150, 200, 255, 0.35));
}

.data-container {
	width: 100%;
	background: transparent;
	height: 100%;
	grid-row: span 2;
}

.data-container :deep(.p-4),
.data-container :deep(.sm\:p-6) {
	height: 100%;
	min-height: 0;
	padding: 0.5rem;
	display: grid;
	grid-template-rows: auto 1fr;
}

.temp-data-container {
	width: 100%;
	height: 100%;
	grid-row: 3 / 5;
	grid-column: 3 /5;
}

.temp-data-container :deep(.p-4),
.temp-data-container :deep(.sm\:p-6) {
	height: 100%;
	min-height: 0;
	padding: 0.5rem;
	display: grid;
	grid-template-rows: auto 1fr;
}

.two-col {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 0.5rem;
	height: 100%;
	min-height: 0;
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
