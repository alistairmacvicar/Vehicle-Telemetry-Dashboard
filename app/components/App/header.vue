<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const route = useRoute();

const items = computed<NavigationMenuItem[]>(() => [
	{
		label: 'Docs',
		active: route.path.startsWith('/docs/getting-started'),
	},
	{
		label: 'Components',
		active: route.path.startsWith('/docs/components'),
	},
	{
		label: 'Figma',
		target: '_blank',
	},
	{
		label: 'Releases',
		target: '_blank',
	},
]);
</script>

<template>
	<UHeader>
		<template #title>
			<Logo class="h-6 w-auto" />
		</template>

		<UNavigationMenu :items="items" />

		<template #right>
			<UColorModeButton />

			<UTooltip
				text="Open on GitHub"
				:kbds="['meta', 'G']"
			>
				<UButton
					color="neutral"
					variant="ghost"
					to="https://github.com/nuxt/ui"
					target="_blank"
					icon="i-simple-icons-github"
					aria-label="GitHub"
				/>
			</UTooltip>
		</template>
	</UHeader>
</template>
