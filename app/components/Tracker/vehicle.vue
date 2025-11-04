<script setup lang="ts">
const vehicle = await useFetch('/api/vehicle', {
	method: 'GET',
	params: {
		id: 'veh-001',
	},
});
</script>
<template>
	<div>{{ vehicle }}</div>
</template>
<style></style>
