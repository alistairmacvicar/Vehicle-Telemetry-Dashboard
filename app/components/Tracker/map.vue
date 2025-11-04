<template>
	<div
		class="map-container"
		:class="{ dark: isDark }"
	>
		<LMap
			ref="map"
			class="map-full"
			:zoom="zoom"
			:center="center"
			:use-global-leaflet="false"
			@dragstart="onUserMoveStart"
		>
			<LTileLayer
				:key="isDark ? 'dark' : 'light'"
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				attribution='&amp;copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
				layer-type="base"
				name="OpenStreetMap"
				:class-name="isDark ? 'tiles-dark' : 'tiles-light'"
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
					:class-name="isDark ? 'icon-dark' : 'icon-light'"
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
					:options="geoJsonOptions"
				/>
			</LMarker>
		</LMap>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import type { Vehicle } from '../../../shared/types/vehicle';
import ambulanceSvg from '~/assets/icons/MdiAmbulance.svg';
import { useVehicles } from '~/composables/useVehicles';

const props = defineProps<{ followVehicleId?: string }>();

const zoom = ref(10);
const center = ref<Coordinates>([-34.92855422964225, 138.59985851659752]);
const map = ref();
const followId = ref<string | null>(null);
const userPanned = ref(false);

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

const { vehicles, startPolling, stopPolling, getVehicleById } = useVehicles();

// Style options for GeoJSON emergency route with animated class applied on element
const geoJsonOptions = {
	style: () => ({
		color: '#2563eb', // initial blue; animated via CSS
		weight: 4,
		opacity: 1,
	}),
	onEachFeature: (_feature: any, layer: any) => {
		layer.on('add', () => {
			const el = layer?.getElement?.();
			if (el) el.classList.add('emergency-route');
		});
	},
};

onMounted(() => {
	startPolling();
});

onBeforeUnmount(() => {
	stopPolling();
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
	const vehicles = list.find((v) => v.id === followId.value);
	if (!vehicles) return;
	center.value = [
		vehicles.currentData.latitude,
		vehicles.currentData.longitude,
	];
	map.value?.leafletObject?.panTo(center.value);
});

watch(
	() => props.followVehicleId,
	(id) => {
		if (!id) return;
		followId.value = id;
		const vehicle = getVehicleById(id);
		if (!vehicle) return;
		center.value = [
			vehicle.currentData.latitude,
			vehicle.currentData.longitude,
		];
		zoomIn();
		map.value?.leafletObject?.panTo(center.value);
		userPanned.value = false;
	},
	{ immediate: true }
);
</script>

<style scoped>
.map-container {
	width: 100%;
	height: 100%;
}

.map-full {
	width: 100%;
	height: 100%;
}

:deep(.tiles-dark .leaflet-tile) {
	filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
}

:deep(.tiles-light .leaflet-tile) {
	filter: none;
}

:deep(.icon-dark) {
	filter: invert(75%) hue-rotate(180deg) brightness(110%) saturate(120%);
}

:deep(.icon-light) {
	filter: none;
}

:deep(.leaflet-popup-content) {
	margin: 1rem 1rem;
}

:deep(.leaflet-popup-content a.details-button) {
	color: #111827 !important;
	text-decoration: none !important;
}

:deep(.leaflet-container) {
	background: var(--ui-bg, #0b0f14);
}

:deep(.leaflet-bar a) {
	background: var(--ui-bg-elevated, var(--ui-bg, #111827));
	color: var(--ui-text, #e5e7eb);
	border-color: var(--ui-border, #374151);
}

@keyframes emergencyColorSwap {
	0%, 100% {
		stroke: #2563eb; /* blue-600 */
		fill: rgba(37, 99, 235, 0.15);
	}
	50% {
		stroke: #ef4444; /* red-500 */
		fill: rgba(239, 68, 68, 0.15);
	}
}

:deep(.emergency-route) {
	animation: emergencyColorSwap 1s ease-in-out infinite;
	transition: stroke 0.4s ease, fill 0.4s ease;
}
:deep(.leaflet-bar a:hover) {
	background: var(--ui-bg-hover, #1f2937);
	color: var(--ui-text, #f3f4f6);
}

:deep(.leaflet-control-attribution) {
	background: color-mix(in oklab, var(--ui-bg, #111827) 92%, transparent);
	color: var(--ui-muted, #9ca3af);
	border-top: 1px solid var(--ui-border, #374151);
}

:deep(.leaflet-control-scale-line) {
	background: var(--ui-bg-elevated, var(--ui-bg, #111827));
	color: var(--ui-text, #e5e7eb);
	border-color: var(--ui-border, #374151);
}

:deep(.leaflet-popup-content-wrapper),
:deep(.leaflet-popup-tip) {
	background: var(--ui-bg-elevated, var(--ui-bg, #111827));
	color: var(--ui-text, #e5e7eb);
	border: 1px solid var(--ui-border, #374151);
}

:deep(.leaflet-tooltip) {
	background: color-mix(in oklab, var(--ui-bg, #111827) 92%, transparent);
	color: var(--ui-text, #e5e7eb);
	border-color: var(--ui-border, #374151);
}
</style>
