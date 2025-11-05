<script setup lang="ts">
const colorMode = useColorMode();
const brandImage = computed(() =>
	colorMode.value === 'dark' ? 'ica_full_mono.png' : 'ica_full_colour.png'
);
const flindersLogo = computed(() =>
	colorMode.value === 'dark'
		? 'flinders_icon_dark.png'
		: 'flinders_icon_light.png'
);
const saHealthLogo = computed(() =>
	colorMode.value === 'dark' ? 'sa_health_dark.png' : 'sa_health_light.png'
);
</script>

<template>
    <UHeader
        mode="slideover"
        class="h-30 relative"
    >
		<template #left>
			<div class="header-left">
				<NuxtLink
					to="/"
					aria-label="Go to home"
					class="home-link pl-1"
				>
					<UIcon
						name="i-heroicons-home-20-solid"
						class="home-icon text-black dark:text-white text-[3rem]"
					/>
				</NuxtLink>
				<UColorModeButton class="text-[2rem] ml-8 color-mode-button" />
			</div>
        </template>

		<div class="header-center">
			<div class="marquee-container">
				<UMarquee>
					<NuxtImg
						src="ic_colour.png"
						class="marquee-image"
					/>
					<NuxtImg
						src="niin.PNG"
						class="marquee-image"
					/>
					<NuxtImg
						src="sa_ambulance_icon.PNG"
						class="marquee-image"
					/>
					<NuxtImg
						src="cisco_colour.png"
						class="marquee-image"
					/>
					<NuxtImg
						id="flinders-logo"
						:src="flindersLogo"
						style="height: 10rem"
					/>
					<NuxtImg
						:src="saHealthLogo"
						class="marquee-image"
					/>
				</UMarquee>
			</div>
		</div>
		<template #right>
			<div class="header-right">
				<NuxtImg
					class="main-logo"
					:src="brandImage"
				/>
			</div>
        </template>
        <div
            aria-hidden="true"
            class="absolute left-0 right-0 bottom-0 h-[2px] bg-gray-200 dark:bg-gray-800 pointer-events-none z-50"
        />
	</UHeader>
</template>

<style scoped>
.header-root {
	position: relative;
	width: 100vw;
	left: 50%;
	right: 50%;
	margin-left: -50vw;
	margin-right: -50vw;
}

.header-left {
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding-left: 1rem;
}

.header-right {
	position: absolute;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding-right: 1rem;
}

.header-title {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	text-align: center;
}

.header-center {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	text-align: center;
}

.app-title {
	font-weight: 600;
	font-size: 3rem;
	margin: 0;
}

.main-logo {
	height: 6rem;
}

.marquee-image {
	height: 5rem;
}

.marquee-container {
	width: 60vw;
	max-width: 900px;
}

.color-mode-button {
	transform: scale(1.5);
}
</style>
