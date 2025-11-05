<template>
	<div class="page-fill">
		<UCard class="map-card">
			<TrackerMap />
		</UCard>
	</div>
</template>

<script lang="ts" setup></script>

<style>
.page-fill {
	height: 100%;
	min-height: 0;
	padding: 1rem;
}

.map-card {
	width: 100%;
	height: 100%;
}

.map-card .p-4,
.map-card .sm\:p-6 {
	height: 100%;
	min-height: 0;
	padding: 0;
}
</style>
