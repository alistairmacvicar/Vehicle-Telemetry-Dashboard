<template>
	<UApp>
		<div class="app-grid">
			<AppHeader />
			<div class="app-content">
				<NuxtPage />
			</div>
		</div>
	</UApp>
</template>

<style>
	.app-grid {
		min-height: 100vh;
		display: grid;
		grid-template-rows: auto 1fr;
	}

	.app-content {
		min-height: 0;
		height: 100%;
	}
</style>
