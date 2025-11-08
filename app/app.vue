<template>
	<UApp>
		<div class="app-root">
			<AppHeader />
			<UMain class="page-shell">
				<NuxtPage />
			</UMain>
		</div>
	</UApp>
</template>

<script setup lang="ts"></script>

<style>
html,
body {
	height: 100%;
}

.app-root {
	display: grid;
	grid-template-rows: auto 1fr;
	height: 100dvh;
	min-height: 0;
	overflow: hidden;
}

.page-shell {
	min-height: 0;
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	padding: 0.5rem;
}

@media (min-width: 1024px) {
	.page-shell {
		padding: 1rem;
	}
}
</style>
