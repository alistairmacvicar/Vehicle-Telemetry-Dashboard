<template>
	<div class="map-container">
		<LMap
			ref="map"
			:zoom="zoom"
			:center="center"
			:use-global-leaflet="false"
			@dragstart="onUserMoveStart"
		>
			<LTileLayer
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				attribution='&amp;copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
				layer-type="base"
				name="OpenStreetMap"
			/>
			<LMarker
				v-for="vehicle in vehicles"
				:key="vehicle.id"
				:lat-lng="[vehicle.currentData.latitude, vehicle.currentData.longitude]"
				@click="
					followVehicle(vehicle);
					zoomIn();
				"
			>
				<LIcon
					:icon-url="ambulanceSvg"
					:icon-size="[50, 50]"
					:icon-anchor="[25, 10]"
				/>
				<LPopup
					class="popup"
					style="margin: 0"
				>
					<TrackerVehiclePopup :vehicle="vehicle" />
				</LPopup>
				<LGeoJson
					v-if="vehicle.currentData.emergencyLights"
					:geojson="vehicle.route.geoJSON"
				/>
			</LMarker>
		</LMap>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Vehicle } from '../../../shared/types/vehicle';
import ambulanceSvg from '~/assets/icons/MdiAmbulance.svg';

const zoom = ref(10);
const center = ref<Coordinates>([-34.92855422964225, 138.59985851659752]);
const map = ref();
const followId = ref<string | null>(null);
const userPanned = ref(false);

const { data: vehicles } = await useFetch<Vehicle[]>('/api/vehicles', {
	method: 'GET',
	query: {
		id: 'all',
	},
});

let timer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
	timer = setInterval(() => {
		refreshNuxtData();
	}, 1000);
});

onBeforeUnmount(() => {
	if (timer) clearInterval(timer);
});

function zoomIn() {
	zoom.value = 30;
	map.value?.leafletObject?.setZoom(zoom.value);
}

function followVehicle(vehicle: Vehicle) {
	followId.value = vehicle.id;
	center.value = [vehicle.currentData.latitude, vehicle.currentData.longitude];
	map.value?.leafletObject?.panTo(center.value);
	userPanned.value = false;
}

function onUserMoveStart() {
	console.log('User panned the map, stopping follow.');
	userPanned.value = true;
}

watch(vehicles, (list) => {
	if (!list || !followId.value || userPanned.value) return;
	const v = list.find((x) => x.id === followId.value);
	if (!v) return;
	const c: [number, number] = [v.currentData.latitude, v.currentData.longitude];
	center.value = c;
	map.value?.leafletObject?.panTo(c);
});
</script>

<style scoped>
.map-container {
	width: 100vw;
	height: 100vh;
}

:deep(.leaflet-popup-content) {
	margin: 1rem 1rem;
}

:deep(.leaflet-popup-content a.details-button) {
	color: inherit !important;
	text-decoration: none !important;
}
</style>
