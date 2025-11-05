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
	height: 100%;
	min-height: 0;
	padding: 1rem;
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 1rem;
}

.sidebar {
	grid-column: 1;
	grid-row: 1;
	width: 15vw;
	min-width: 260px;
	height: 100%;
}

.map-card {
	width: 100%;
	height: 100%;
	grid-column: 2;
	grid-row: 1;
}

.map-card .p-4,
.map-card .sm\:p-6 {
	height: 100%;
	min-height: 0;
    padding: 0;
}

.sidebar :is(.p-4, .sm\:p-6) {
	padding: 0.5rem;
	height: 100%;
	min-height: 0;
}
</style>
