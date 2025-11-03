<script setup lang="ts">
const { data, status } = await useFetch('/api/directions', {
	lazy: true,
	method: 'GET',
	query: {
		start: '8.681495,49.41461',
		end: '8.687872,49.420318',
	},
});
</script>
<template>
	<div v-if="status.pending">loading...</div>
	<div v-else-if="status.error">Error: {{ status.error.message }}</div>
	<div v-else>
		{{ data }}
	</div>
</template>
<style></style>
