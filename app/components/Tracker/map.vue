<template>
	<div
		class="map-container"
		:class="containerClass"
	>
		<LMap
			ref="map"
			class="map-full"
			:zoom="zoom"
			:center="center"
			:use-global-leaflet="false"
			@ready="onMapReady"
			@dragstart="onUserMoveStart"
			@zoomstart="onZoomStart"
			@zoomend="onZoomEnd"
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
				@click="followVehicle(vehicle)"
				:ref="setMarkerRef(vehicle.id)"
			>
				<LIcon
					:icon-url="ambulanceSvg"
					:icon-size="[50, 50]"
					:icon-anchor="[25, 10]"
					:popup-anchor="[0, -30]"
					:class-name="getIconClass(vehicle)"
				/>
				<LPopup
					class="popup"
					style="margin: 0"
					:options="{ autoPan: false }"
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
import {
	ref,
	computed,
	watch,
	onMounted,
	onBeforeUnmount,
	nextTick,
} from 'vue';
import type { Vehicle } from '../../../shared/types/vehicle';
import ambulanceSvg from '~/assets/icons/MdiAmbulance.svg';
import { useVehicles } from '~/composables/useVehicles';

const props = defineProps<{ followVehicleId?: string }>();

const zoom = ref(10);
const center = ref<Coordinates>([-34.92855422964225, 138.59985851659752]);
const map = ref();
const followId = ref<string | null>(null);
const userPanned = ref(false);
const isZooming = ref(false);
const isCentering = ref(false);

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');
const containerClass = ref('');

function updateContainerClass() {
	containerClass.value = colorMode.value === 'dark' ? 'dark' : '';
}

const { vehicles, startPolling, stopPolling, getVehicleById } = useVehicles();
const POLL_INTERVAL_MS = 2000;

const markerRefs = new Map<string, any>();
function setMarkerRef(id: string) {
	return (el: any) => {
		if (el) markerRefs.set(id, el);
		else markerRefs.delete(id);
	};
}

function openFollowPopup() {
	if (!followId.value) return;
	const markerComp = markerRefs.get(followId.value);
	const leafletMarker = markerComp?.leafletObject;
	const m = map.value?.leafletObject;
	if (leafletMarker && m) {
		nextTick(() => {
			try {
				leafletMarker.openPopup?.();
			} catch {}
		});
	}
}

function nudgeIntoSafeBox() {
	const m = map.value?.leafletObject;
	if (
		!m ||
		!followId.value ||
		userPanned.value ||
		isZooming.value ||
		isCentering.value
	)
		return;
	const mapEl = m.getContainer();
	const targetEl = mapEl.querySelector('.is-followed') as HTMLElement | null;

	if (!targetEl) return;

	const mapRect = mapEl.getBoundingClientRect();
	const tRect = targetEl.getBoundingClientRect();
	const iconCx = tRect.left + tRect.width / 2;
	const iconCy = tRect.top + tRect.height / 2;
	const mapCx = mapRect.left + mapRect.width / 2;
	const mapCy = mapRect.top + mapRect.height / 2;
	const dx = iconCx - mapCx;
	const dy = iconCy - mapCy;
	const threshX = mapRect.width * 0.2;
	const threshY = mapRect.height * 0.2;

	if (Math.abs(dx) > threshX || Math.abs(dy) > threshY) {
		const fx = 1;
		const fy = 1;
		m.panBy([dx * fx, dy * fy], {
			animate: true,
			duration: 1,
			easeLinearity: 0.3,
		});
	}
}

function withNoMarkerTransitions(run: () => void) {
	const m = map.value?.leafletObject;
	const container = m?.getContainer?.();
	if (!container) {
		run();
		return;
	}
	container.classList.add('no-marker-transition');
	try {
		run();
	} finally {
		requestAnimationFrame(() =>
			container.classList.remove('no-marker-transition')
		);
	}
}

function ensureCentered() {
	const m = map.value?.leafletObject;
	if (!m || !followId.value) return;
	const mapEl = m.getContainer();
	const markerEl = mapEl.querySelector('.is-followed') as HTMLElement | null;
	if (!markerEl) return;
	const mapRect = mapEl.getBoundingClientRect();
	const markerRect = markerEl.getBoundingClientRect();
	const markerCx = markerRect.left + markerRect.width / 2;
	const markerCy = markerRect.top + markerRect.height / 2;
	const mapCx = mapRect.left + mapRect.width / 2;
	const mapCy = mapRect.top + mapRect.height / 2;
	const dx = markerCx - mapCx;
	const dy = markerCy - mapCy;
	if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
		m.panBy([dx, dy], { animate: false });
	}
}

function getIconClass(vehicle: Vehicle) {
	const base = isDark.value ? 'icon-dark' : 'icon-light';
	return vehicle.id === followId.value ? `${base} is-followed` : base;
}

const geoJsonOptions = {
	style: () => ({
		color: '#2563eb',
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
	startPolling(POLL_INTERVAL_MS);
	updateContainerClass();
	watch(() => colorMode.value, updateContainerClass);
});

onBeforeUnmount(() => {
	stopPolling();
});

function followVehicle(vehicle: Vehicle) {
	followId.value = vehicle.id;
	center.value = [vehicle.currentData.latitude, vehicle.currentData.longitude];

	const m = map.value?.leafletObject;
	const FOLLOW_ZOOM = 18;
	zoom.value = Math.max(zoom.value, FOLLOW_ZOOM);
	if (m) {
		m.closePopup?.();
		isCentering.value = true;
		withNoMarkerTransitions(() => {
			const targetZoom = Math.max(m.getZoom?.() ?? 0, FOLLOW_ZOOM);
			m.setView([center.value[0], center.value[1]], targetZoom, {
				animate: false,
			});
		});
	}
	userPanned.value = false;
	openFollowPopup();
	nextTick(() => {
		ensureCentered();
		isCentering.value = false;
	});
}

function onMapReady() {
	if (!followId.value) return;
	const vehicle = getVehicleById(followId.value);
	if (vehicle) followVehicle(vehicle);
}

function onUserMoveStart() {
	userPanned.value = true;
}

function onZoomStart() {
	isZooming.value = true;
}

function onZoomEnd() {
	isZooming.value = false;
}

watch(vehicles, (list) => {
	if (!list || !followId.value || userPanned.value) return;
	const v = list.find((x) => x.id === followId.value);
	if (!v) return;
	openFollowPopup();
	nudgeIntoSafeBox();
});

watch(
	() => props.followVehicleId,
	(id) => {
		if (!id) return;
		followId.value = id;
		const vehicle = getVehicleById(id);
		if (vehicle) {
			followVehicle(vehicle);
		}
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
	0%,
	100% {
		stroke: #2563eb;
	}
	50% {
		stroke: #ef4444;
	}
}

:deep(.emergency-route) {
	animation: emergencyColorSwap 1s ease-in-out infinite;
	transition: stroke 0.4s ease;
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

:deep(.icon-dark),
:deep(.icon-light) {
	transition: transform 2s linear;
	will-change: transform;
}

:deep(.leaflet-zoom-anim .icon-dark),
:deep(.leaflet-zoom-anim .icon-light) {
	transition: none !important;
}

:deep(.leaflet-popup) {
	transition: transform 2s linear;
	will-change: transform;
}

:deep(.leaflet-zoom-anim .leaflet-popup) {
	transition: none !important;
}

:deep(.no-marker-transition .icon-dark),
:deep(.no-marker-transition .icon-light),
:deep(.no-marker-transition .leaflet-popup) {
	transition: none !important;
}
</style>
