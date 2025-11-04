// https://nuxt.com/docs/api/configuration/nuxt-config
import './app/lib/env.ts';
export default defineNuxtConfig({
				compatibilityDate: '2025-07-15',
				devtools: { enabled: true },
				modules: [
				 '@nuxt/eslint',
				 '@nuxt/icon',
				 '@nuxt/ui',
				 '@nuxtjs/leaflet',
				 '@nuxtjs/color-mode',
				],
                css: ['leaflet/dist/leaflet.css', '~/assets/css/main.css'],
});