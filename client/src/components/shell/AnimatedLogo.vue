<script setup>
const props = defineProps({
  size: {
    type: [Number, String],
    default: 48,
  },
})

const logoSize = `${props.size}`.endsWith('px') ? `${props.size}` : `${props.size}px`
</script>

<template>
  <span
    class="zoo-logo"
    :style="{ width: logoSize, height: logoSize }"
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 64 64"
      fill="none"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path class="logo-shadow" d="M14 10h26v4h4v26h-4v4H14v-4h-4V14h4v-4Z" />
      <path class="logo-frame" d="M12 8h28v4h4v28h-4v4H12v-4H8V12h4V8Z" />
      <path class="logo-lens" d="M18 18h18v4h4v18h-4v4H18v-4h-4V22h4v-4Z" />
      <path class="logo-glass" d="M20 20h14v4h4v14h-4v4H20v-4h-4V24h4v-4Z" />
      <path class="logo-handle" d="M40 40h6v4h4v4h4v8h-8v-4h-4v-4h-4v-6h2v-2Z" />
      <path class="logo-pixel logo-pixel-a" d="M48 8h6v6h-6V8Z" />
      <path class="logo-pixel logo-pixel-b" d="M8 50h6v6H8v-6Z" />
    </svg>
  </span>
</template>

<style scoped>
.zoo-logo {
  display: inline-block;
  flex: 0 0 auto;
  color: var(--zoo-logo-color, currentColor);
  line-height: 0;
  transform-origin: center;
  animation: zoo-logo-idle 1.8s steps(2, end) infinite;
}

.zoo-logo svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.logo-shadow {
  fill: rgba(29, 36, 48, 0.2);
}

.logo-frame,
.logo-handle,
.logo-pixel {
  fill: currentColor;
}

.logo-lens {
  fill: var(--zoo-lens-fill, var(--surface, #fffdf7));
}

.logo-glass {
  fill: color-mix(in srgb, var(--zoo-lens-fill, #fffdf7) 78%, currentColor 22%);
}

.logo-pixel-a {
  animation: zoo-logo-blink 1.2s steps(1, end) infinite;
}

.logo-pixel-b {
  animation: zoo-logo-blink 1.2s steps(1, end) infinite reverse;
}

@keyframes zoo-logo-idle {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(1px, -1px); }
}

@keyframes zoo-logo-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  .zoo-logo,
  .logo-pixel-a,
  .logo-pixel-b {
    animation: none;
  }
}
</style>
