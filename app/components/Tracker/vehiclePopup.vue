<script setup lang="ts">
import type { Vehicle } from '../../../shared/types/vehicle';

defineProps<{ vehicle: Vehicle }>();
</script>
<template>
	<div class="container">
		<div class="license-plate">
			<div class="rego">
				{{ vehicle.id }}
			</div>
			<p class="state">SOUTH AUSTRALIA</p>
		</div>
		<div class="gauges">
			<div class="speed-container">
				<div class="speed-value">
					{{ vehicle.currentData.speed.toFixed(1) }}
				</div>
				<div id="unit">km/h</div>
			</div>
			<div class="fuel-container">
				<div class="fuel-row">
					<div class="fuel-gauge">
						<div
							class="fuel-gauge__fill"
							:style="{ height: vehicle.currentData.fuelLevel + '%' }"
						></div>
					</div>
					<div class="fuel-label">
						<span>{{ vehicle.currentData.fuelLevel?.toFixed(0) || 50 }}%</span>
						<Icon
							name="mdi:gas-station"
							size="1rem"
						/>
					</div>
				</div>
			</div>
		</div>
		<UButton
			color="primary"
			trailing-icon="i-lucide-arrow-right"
			class="details-button"
			:to="vehicle.id"
			>More</UButton
		>
	</div>
</template>
<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

.license-plate {
	font-family: 'Bebas Neue', Arial, sans-serif;
}

.license-plate {
	position: static;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 0;
	background-color: white;
	border: solid black 0.2rem;
	border-radius: 0.5rem;
	text-transform: uppercase;
	width: 10rem;
}

.rego {
	font-size: 3rem;
}

.state {
	margin: -1rem 0 0 0;
	font-size: 0.75rem;
}

.container {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	align-items: center;
	padding: 0;
	margin: 0;
}

.gauges {
	display: grid;
	grid-template-columns: 1fr 1fr;
	align-items: stretch;
	gap: 0.5rem;
	width: 10rem;
	height: 6rem;
}

.speed-container,
.fuel-container {
	height: 100%;
	width: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.speed-value {
	font-size: 2rem;
	font-weight: bold;
}

.fuel-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.fuel-gauge {
	height: 3.5rem;
	width: 1.7rem;
	border: 2px solid #111;
	border-radius: 6px;
	background: #e7e7e7;
	display: flex;
	align-items: flex-end;
	overflow: hidden;
}

.fuel-gauge__fill {
	width: 100%;
	height: 0;
	background: linear-gradient(180deg, #3abf3a, #2e8b2e);
	transition: height 200ms ease;
}

.fuel-label {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.25rem;
	font-weight: 600;
}

.details-button {
	width: 100%;
}
</style>
