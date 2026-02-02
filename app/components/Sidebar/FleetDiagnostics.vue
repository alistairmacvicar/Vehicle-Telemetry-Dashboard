<template>
  <div class="sidebar-root">
    <div class="sidebar-title">
      <span class="title-glow">Fleet Diagnostics</span>
      <UIcon name="i-heroicons-cpu-chip-20-solid" class="title-icon" />
    </div>

    <div class="sidebar-summary">
      <div class="summary-card">
        <div class="summary-label">Vehicles</div>
        <div class="summary-value">{{ (vehicles || []).length }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Active Lights</div>
        <div class="summary-value">{{ activeLightsCount }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Avg Speed</div>
        <div class="summary-value">{{ averageSpeed.toFixed(0) }} km/h</div>
      </div>
    </div>

    <div
      v-if="vehicles && vehicles.length"
      ref="sidebarList"
      :class="['sidebar-list', { 'is-scroll': isScrolling }]"
    >
      <div
        v-for="vehicle in vehicles"
        :key="vehicle.id"
        class="vehicle-card"
        :class="statusClass(vehicle)"
      >
        <div class="vehicle-header">
          <div class="vehicle-name">
            <UIcon name="i-heroicons-truck-20-solid" class="vehicle-icon" />
            <span>{{ vehicle.name }}</span>
          </div>
          <div class="status-pill">
            <span>{{ statusLabel(vehicle) }}</span>
            <span class="pulse-dot" :class="{ 'is-alert': vehicle.currentData.emergencyLights }" />
          </div>
        </div>

        <div class="metrics-row">
          <div class="metric speed">
            <div class="metric-label">Speed</div>
            <div class="neon-bar">
              <div class="neon-fill" :style="{ width: speedPct(vehicle) + '%' }" />
            </div>
            <div class="metric-value">{{ vehicle.currentData.speed.toFixed(0) }} km/h</div>
          </div>

          <div class="metric fuel">
            <div class="metric-label">Fuel</div>
            <div class="fuel-donut" :style="{ '--p': fuelPct(vehicle) }">
              <div class="fuel-center">{{ fuelPct(vehicle).toFixed(0) }}%</div>
            </div>
          </div>
        </div>

        <div class="metrics-grid">
          <div class="metric temp">
            <UIcon name="i-heroicons-fire-20-solid" class="metric-icon" />
            <div class="metric-label">Oil</div>
            <div class="metric-value">{{ vehicle.currentData.engineOilTemp.toFixed(0) }} °C</div>
          </div>
          <div class="metric temp">
            <UIcon name="i-heroicons-beaker-20-solid" class="metric-icon" />
            <div class="metric-label">Coolant</div>
            <div class="metric-value">
              {{ vehicle.currentData.engineCoolantTemp.toFixed(0) }} °C
            </div>
          </div>
        </div>

        <div class="metrics-row bottom">
          <div class="metric odo">
            <UIcon name="i-heroicons-map-20-solid" class="metric-icon" />
            <div class="metric-label">Odo</div>
            <div class="metric-value">{{ vehicle.currentData.odometer.toFixed(0) }} km</div>
          </div>
          <div class="heading-metric">
            <div class="heading-label">{{ vehicle.currentData.heading.toFixed(0) }}°</div>
            <div
              class="arrow"
              :style="{ transform: 'rotate(' + vehicle.currentData.heading + 'deg)' }"
            />
          </div>
          <div class="bottom-button">
            <UButton
              class="details-link"
              color="primary"
              variant="soft"
              size="xs"
              trailing-icon="i-heroicons-arrow-right-20-solid"
              aria-label="Follow on map"
              @click="handleFollow(vehicle)"
            >
              Find
            </UButton>
          </div>
        </div>

        <div v-show="hasScroll" class="scrollbar-overlay">
          <div
            class="scrollbar-thumb"
            :style="{
              height: thumbSize + 'px',
              transform: 'translateY(' + thumbOffset + 'px)',
            }"
          />
        </div>
      </div>
    </div>

    <div v-else class="sidebar-empty">
      <div class="shimmer" />
      <div class="empty-text">Loading live telemetry…</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue';
import type { Vehicle } from '~~/shared/types/vehicle';
import { useVehicles } from '~/composables/useVehicles';

const { vehicles, startPolling } = useVehicles();
onMounted(() => {
  startPolling();
});

const sidebarList = ref<HTMLElement | null>(null);
const isScrolling = ref(false);
let scrollTimer: number | null = null;

const hasScroll = ref(false);
const thumbSize = ref(0);
const thumbOffset = ref(0);

function recalcScrollbar() {
  if (!sidebarList.value) return;
  const el = sidebarList.value;
  const vh = el.clientHeight;
  const sh = el.scrollHeight;
  const lastChild = el.lastElementChild as HTMLElement | null;
  let contentBottom = sh;
  if (lastChild) {
    contentBottom = lastChild.offsetTop + lastChild.offsetHeight;
  }
  const effectiveScrollable = Math.max(0, contentBottom - vh);
  hasScroll.value = effectiveScrollable > 4;
  if (!hasScroll.value) return;
  const track = Math.max(0, vh - 8);
  const minThumb = 24;
  thumbSize.value = Math.min(track, Math.max(minThumb, (vh / contentBottom) * track));
  const maxOffset = Math.max(0, track - thumbSize.value);
  const rawOffset = effectiveScrollable <= 0 ? 0 : (el.scrollTop / effectiveScrollable) * maxOffset;
  thumbOffset.value = Math.min(maxOffset, Math.max(0, rawOffset));
}

function onListScroll() {
  isScrolling.value = true;
  recalcScrollbar();
  if (scrollTimer) window.clearTimeout(scrollTimer);
  scrollTimer = window.setTimeout(() => {
    isScrolling.value = false;
  }, 600);
}

onMounted(() => {
  if (sidebarList.value) {
    sidebarList.value.addEventListener('scroll', onListScroll, {
      passive: true,
    });
    sidebarList.value.addEventListener('mouseenter', recalcScrollbar, {
      passive: true,
    });
  }
  window.addEventListener('resize', recalcScrollbar, { passive: true });
  nextTick(recalcScrollbar);
});

onUnmounted(() => {
  if (sidebarList.value) {
    sidebarList.value.removeEventListener('scroll', onListScroll);
    sidebarList.value.removeEventListener('mouseenter', recalcScrollbar);
  }
  window.removeEventListener('resize', recalcScrollbar);
  if (scrollTimer) window.clearTimeout(scrollTimer);
});

const followVehicleId = useState<string | null>('followVehicleId', () => null);
function handleFollow(vehicle: Vehicle) {
  followVehicleId.value = vehicle.id;
}

const activeLightsCount = computed(
  () => (vehicles.value || []).filter((vehicle) => vehicle.currentData.emergencyLights).length,
);

const averageSpeed = computed(() => {
  const list = vehicles.value || [];
  if (!list.length) return 0;
  return list.reduce((sum, vehicle) => sum + (vehicle.currentData.speed || 0), 0) / list.length;
});

function fuelPct(vehicle: Vehicle): number {
  return Math.max(0, Math.min(100, vehicle.currentData.fuelLevel));
}

function speedPct(vehicle: Vehicle): number {
  return Math.max(0, Math.min(100, Number(vehicle.currentData.speed || 0)));
}

function statusLabel(vehicle: Vehicle): string {
  const oil = Number(vehicle.currentData.engineOilTemp || 0);
  const cool = Number(vehicle.currentData.engineCoolantTemp || 0);
  const fuel = Number(vehicle.currentData.fuelLevel || 0);
  if (vehicle.currentData.emergencyLights) return 'ALERT';
  if (oil > 120 || cool > 110 || fuel < 10) return 'CRITICAL';
  if (oil > 105 || cool > 100 || fuel < 20) return 'WARN';
  return 'OK';
}

function statusClass(vehicle: Vehicle): string {
  switch (statusLabel(vehicle)) {
    case 'CRITICAL':
      return 'is-critical';
    case 'WARN':
      return 'is-warn';
    case 'ALERT':
      return 'is-alert';
    default:
      return 'is-ok';
  }
}
</script>

<style scoped>
.sidebar-root {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--panel-bg);
  backdrop-filter: blur(8px);
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
  box-shadow:
    0 0 0 1px var(--inset-outline) inset,
    var(--outer-shadow-1),
    var(--outer-shadow-2);
  padding: 0.5rem;
  max-height: 100%;
}

.sidebar-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.5rem;
}

.title-glow {
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #3b82f6;
}

.title-icon {
  font-size: 1.25rem;
  color: #6b7280;
}

.sidebar-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  gap: 0.5rem;
}

.summary-card {
  position: relative;
  border-radius: 0.5rem;
  padding: 0.5rem;
  background: linear-gradient(180deg, var(--muted-start), var(--muted-end));
  border: 1px solid var(--border-color);
  box-shadow:
    0 0 0 1px var(--inset-outline) inset,
    0 6px 16px rgba(10, 14, 30, 0.4);
  display: grid;
  grid-template-rows: auto 1fr;
  align-content: center;
  height: 84px;
}

.summary-label {
  font-size: 0.7rem;
  opacity: 0.8;
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  min-width: 4ch;
  white-space: nowrap;
}

.sidebar-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: grid;
  grid-template-columns: 1fr;
  justify-items: stretch;
  gap: 0.5rem;
  position: relative;
  scrollbar-width: none;
}
:deep(.sidebar-list::-webkit-scrollbar) {
  width: 0;
  height: 0;
}

.scrollbar-overlay {
  position: absolute;
  top: 4px;
  right: 4px;
  bottom: 4px;
  width: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
  z-index: 2;
}
.sidebar-list:hover .scrollbar-overlay,
.sidebar-list.is-scroll .scrollbar-overlay {
  opacity: 1;
}
.scrollbar-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(148, 163, 184, 0.15);
  border-radius: 6px;
}
.scrollbar-thumb {
  position: absolute;
  left: 0;
  width: 100%;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.6);
}

.vehicle-card {
  position: relative;
  border-radius: 0.75rem;
  padding: 0.75rem;
  background: linear-gradient(180deg, var(--surface-start), var(--surface-end));
  border: 1px solid var(--border-color);
  box-shadow:
    0 0 0 1px var(--inset-outline) inset,
    var(--card-shadow);
  transition:
    transform 120ms ease,
    box-shadow 200ms ease,
    border-color 200ms ease;
  width: 100%;
  justify-self: stretch;
  box-sizing: border-box;
  min-width: 0;
}

.vehicle-card.is-ok {
  border-color: rgba(50, 220, 140, 0.35);
}
.vehicle-card.is-warn {
  border-color: rgba(255, 200, 60, 0.45);
  box-shadow:
    0 0 0 1px rgba(255, 200, 60, 0.15) inset,
    0 12px 26px rgba(10, 14, 30, 0.55),
    0 0 16px rgba(255, 200, 60, 0.18);
}
.vehicle-card.is-critical,
.vehicle-card.is-alert {
  border-color: rgba(255, 70, 70, 0.5);
  box-shadow:
    0 0 0 1px rgba(255, 70, 70, 0.18) inset,
    0 12px 28px rgba(10, 14, 30, 0.6),
    0 0 20px rgba(255, 70, 70, 0.22);
}

.vehicle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.vehicle-name {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
}

.vehicle-icon {
  color: #6b7280;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: linear-gradient(180deg, var(--muted-start), var(--muted-end));
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #32dc8c;
  box-shadow: 0 0 10px rgba(50, 220, 140, 0.7);
  animation: pulse 2s infinite;
}
.pulse-dot.is-alert {
  background: #ff4a4a;
  box-shadow: 0 0 12px rgba(255, 74, 74, 0.85);
  animation-duration: 1s;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

.metrics-row {
  display: grid;
  grid-template-columns: 1fr 72px;
  gap: 0.5rem;
  align-items: center;
  margin: 0.25rem 0;
}
.metrics-row.bottom {
  grid-template-columns: 2fr 1fr 1fr;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.metric {
  display: grid;
  gap: 0.25rem;
  align-items: center;
}
.metric-label {
  font-size: 0.7rem;
  opacity: 0.8;
}
.metric-value {
  font-size: 0.85rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  min-width: 6ch;
  white-space: nowrap;
}

.neon-bar {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--bar-bg-a), var(--bar-bg-b));
  box-shadow: inset 0 0 0 1px rgba(100, 140, 220, 0.25);
}
.neon-fill {
  height: 100%;
  border-radius: 999px;
  background: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  transition: width 300ms ease;
}

.fuel-donut {
  --size: 54px;
  --thickness: 8px;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background:
    conic-gradient(#3b82f6 calc(var(--p) * 1%), var(--donut-track) 0),
    radial-gradient(
      circle at 50% 50%,
      var(--donut-inner) calc(50% - var(--thickness)),
      transparent calc(50% - var(--thickness) + 1px)
    );
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
  position: relative;
}
.fuel-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}
.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.metric.temp {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.35rem;
}
.metric.odo {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 0.35rem;
}
.metric.odo .metric-value {
  justify-self: end;
  text-align: right;
}
.heading-metric {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  justify-self: start;
  padding-left: 0.4rem;
  gap: 0.35rem;
  flex-direction: row-reverse;
}
.bottom-button {
  justify-self: end;
}
.metric-icon {
  color: #9db6ff;
  filter: drop-shadow(0 0 6px rgba(150, 200, 255, 0.35));
}

.footer-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 0.25rem;
}
.heading-indicator {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.arrow {
  width: 0;
  height: 0;
  border-left: 0.5rem solid transparent;
  border-right: 0.5rem solid transparent;
  border-bottom: 0.875rem solid #8fb0ff;
  filter: drop-shadow(0 0 6px rgba(150, 200, 255, 0.4));
  transition: transform 200ms ease;
}
.heading-label {
  font-size: 0.75rem;
  opacity: 0.85;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}
.details-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #8fb0ff;
  text-decoration: none;
  filter: drop-shadow(0 0 6px rgba(130, 160, 255, 0.25));
}
.details-link:hover {
  text-decoration: underline;
}

.sidebar-empty {
  height: 100%;
  min-height: 0;
  display: grid;
  place-items: center;
  gap: 0.5rem;
}
.shimmer {
  width: 90%;
  height: 120px;
  border-radius: 0.75rem;
  background: linear-gradient(
    90deg,
    rgba(40, 50, 90, 0.25) 0%,
    rgba(100, 140, 220, 0.35) 50%,
    rgba(40, 50, 90, 0.25) 100%
  );
  background-size: 200% 100%;
  animation: shimmer-move 1.6s infinite linear;
}
@keyframes shimmer-move {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.empty-text {
  opacity: 0.8;
  font-size: 0.9rem;
}
</style>
