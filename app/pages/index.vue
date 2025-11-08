<template>
	<div class="page-fill">
		<UCard class="map-card vd-surface-card">
			<TrackerMap :follow-vehicle-id="followVehicleId" />
		</UCard>
		<UCard class="sidebar">
			<SidebarFleetDiagnostics />
		</UCard>
	</div>
</template>

<script lang="ts" setup>
const followVehicleId = useState<string | undefined>(
	'followVehicleId',
	() => undefined
);
</script>

<style>
.page-fill {
	flex: 1;
	min-height: 0;
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 1rem;
	overflow: hidden;
}

.sidebar {
	grid-column: 1;
	grid-row: 1;
	width: 15vw;
	min-width: 260px;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.map-card {
	width: 100%;
	grid-column: 2;
	grid-row: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.map-card .p-4,
.map-card .sm\:p-6 {
	flex: 1;
	min-height: 0;
	padding: 0;
	display: flex;
}

.sidebar :is(.p-4, .sm\:p-6) {
	padding: 0.5rem;
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
</style>
