<template>
	<UCard class="vd-surface-card video-card">
		<video
			autoplay
			muted
			playsinline
			loop
			preload="none"
		>
			<source
				src="/assets/video/process.webm"
				type="video/webm"
			/>
			<source
				src="/assets/video/process.mp4"
				type="video/mp4"
			/>
		</video>
	</UCard>
</template>

<script lang="ts" setup></script>

<style>
.video-card {
	margin: 1rem;
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	overflow: hidden;
}
</style>
