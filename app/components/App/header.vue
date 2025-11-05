<script setup lang="ts">
import brandMono from '~/assets/branding/ica_full_mono.png';
import brandColour from '~/assets/branding/ica_full_colour.png';
import flindersDark from '~/assets/branding/flinders_icon_dark.png';
import flindersLight from '~/assets/branding/flinders_icon_light.png';
import saHealthDark from '~/assets/branding/sa_health_dark.png';
import saHealthLight from '~/assets/branding/sa_health_light.png';
import icColour from '~/assets/branding/ic_colour.png';
import niin from '~/assets/branding/niin.png';
import saAmbulanceIcon from '~/assets/branding/sa_ambulance_icon.png';
import ciscoColour from '~/assets/branding/cisco_colour.png';

const colorMode = useColorMode();
const brandImage = computed(() =>
	colorMode.value === 'dark' ? brandMono : brandColour
);
const flindersLogo = computed(() =>
	colorMode.value === 'dark' ? flindersDark : flindersLight
);
const saHealthLogo = computed(() =>
	colorMode.value === 'dark' ? saHealthDark : saHealthLight
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
					<img
						:src="icColour"
						class="marquee-image"
					/>
					<img
						:src="niin"
						class="marquee-image"
					/>
					<img
						:src="saAmbulanceIcon"
						class="marquee-image"
					/>
					<img
						:src="ciscoColour"
						class="marquee-image"
					/>
					<img
						id="flinders-logo"
						:src="flindersLogo"
						style="height: 10rem"
					/>
					<img
						:src="saHealthLogo"
						class="marquee-image"
					/>
				</UMarquee>
			</div>
		</div>
		<template #right>
			<div class="header-right">
				<img
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
