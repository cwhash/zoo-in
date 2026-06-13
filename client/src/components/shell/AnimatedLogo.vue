<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Zoo-In pixel logo: magnifying glass plus cycling silhouettes.
 * Drawn on a 16x16 grid with step animations to keep the pixel look crisp.
 */
const props = defineProps({
  size: {
    type: [Number, String],
    default: 40,
  },
})

const pixelSize = 6
const logoSize = `${props.size}`.endsWith('px') ? `${props.size}` : `${props.size}px`

function row(y, from, to) {
  return Array.from({ length: to - from + 1 }, (_, index) => [from + index, y])
}

const lensFillPixels = [
  ...row(2, 5, 8),
  ...row(3, 4, 9),
  ...row(4, 3, 10),
  ...row(5, 3, 10),
  ...row(6, 3, 10),
  ...row(7, 3, 10),
  ...row(8, 3, 10),
  ...row(9, 4, 9),
  ...row(10, 5, 8),
]

const lensFramePixels = [
  ...row(1, 5, 8),
  [4, 2], [9, 2],
  [3, 3], [10, 3],
  [2, 4], [11, 4],
  [2, 5], [11, 5],
  [2, 6], [11, 6],
  [2, 7], [11, 7],
  [2, 8], [11, 8],
  [3, 9], [10, 9],
  [4, 10], [9, 10],
  ...row(11, 5, 8),
]

const handlePixels = [
  [10, 10], [11, 10],
  [11, 11], [12, 11],
  [12, 12], [13, 12],
  [13, 13], [14, 13],
  [14, 14],
]

const sparklePixels = [
  [4, 3],
  [5, 3],
  [4, 4],
]

const animals = [
  {
    name: 'monkey',
    className: 'animal-1',
    pixels: [
      [4, 3], [9, 3],
      ...row(4, 4, 9),
      ...row(5, 3, 10),
      ...row(6, 4, 9),
      ...row(7, 4, 9),
      ...row(8, 5, 8),
      ...row(9, 5, 8),
      [4, 10], [5, 10], [8, 10], [9, 10],
    ],
    cutouts: [
      [5, 6], [8, 6],
      [6, 8], [7, 8],
    ],
  },
  {
    name: 'alien',
    className: 'animal-2',
    pixels: [
      ...row(3, 5, 8),
      ...row(4, 4, 9),
      ...row(5, 4, 9),
      ...row(6, 5, 8),
      ...row(7, 5, 8),
      ...row(8, 5, 8),
      [4, 9], [5, 9], [8, 9], [9, 9],
      [4, 10], [9, 10],
    ],
    cutouts: [
      [5, 5], [8, 5],
      [6, 6], [7, 6],
    ],
  },
  {
    name: 'butterfly',
    className: 'animal-3',
    pixels: [
      [6, 3], [7, 3],
      [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],
      [3, 5], [4, 5], [6, 5], [7, 5], [9, 5], [10, 5],
      [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6],
      [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7],
      [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8],
      [5, 9], [6, 9], [7, 9], [8, 9],
      [6, 10], [7, 10],
    ],
    cutouts: [
      [4, 6], [9, 6],
      [5, 8], [8, 8],
    ],
  },
  {
    name: 'whale',
    className: 'animal-4',
    pixels: [
      [6, 3],
      [5, 4], [7, 4],
      ...row(5, 4, 9),
      ...row(6, 3, 10),
      ...row(7, 3, 11),
      ...row(8, 4, 10),
      ...row(9, 5, 9),
      [11, 5], [12, 4], [12, 6],
      [11, 8], [12, 8],
    ],
    cutouts: [
      [5, 6],
      [7, 8], [8, 8],
    ],
  },
  {
    name: 'cat',
    className: 'animal-5',
    pixels: [
      [4, 3], [9, 3],
      [4, 4], [5, 4], [8, 4], [9, 4],
      ...row(5, 4, 9),
      ...row(6, 4, 9),
      ...row(7, 4, 9),
      ...row(8, 5, 8),
      ...row(9, 5, 8),
      [4, 10], [5, 10], [8, 10], [9, 10],
    ],
    cutouts: [
      [5, 6], [8, 6],
      [6, 8], [7, 8],
    ],
  },
  {
    name: 'bird',
    className: 'animal-6',
    pixels: [
      [6, 3], [7, 3],
      ...row(4, 5, 8),
      [9, 4],
      ...row(5, 4, 9),
      [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6],
      [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
      [5, 8], [6, 8], [7, 8],
      [5, 9], [7, 9],
      [5, 10], [8, 10],
    ],
    cutouts: [
      [6, 5],
      [6, 9],
    ],
  },
]

const currentAnimalIndex = ref(0)
const currentAnimal = computed(() => animals[currentAnimalIndex.value])
let animalTimer = null
let reducedMotionQuery = null

function pickNextAnimalIndex() {
  if (animals.length <= 1) {
    return 0
  }

  const randomIndex = Math.floor(Math.random() * (animals.length - 1))
  return randomIndex >= currentAnimalIndex.value ? randomIndex + 1 : randomIndex
}

function showRandomAnimal() {
  currentAnimalIndex.value = pickNextAnimalIndex()
}

function stopAnimalTimer() {
  if (animalTimer) {
    window.clearInterval(animalTimer)
    animalTimer = null
  }
}

function startAnimalTimer() {
  stopAnimalTimer()
  animalTimer = window.setInterval(showRandomAnimal, 2000)
}

function handleMotionPreferenceChange(event) {
  if (event.matches) {
    currentAnimalIndex.value = 0
    stopAnimalTimer()
    return
  }

  startAnimalTimer()
}

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (reducedMotionQuery.matches) {
    currentAnimalIndex.value = 0
    return
  }

  startAnimalTimer()
  reducedMotionQuery.addEventListener('change', handleMotionPreferenceChange)
})

onBeforeUnmount(() => {
  stopAnimalTimer()
  reducedMotionQuery?.removeEventListener('change', handleMotionPreferenceChange)
})
</script>

<template>
  <div
    class="zoo-logo"
    :style="{ width: logoSize, height: logoSize }"
    role="img"
    aria-label="Zoo-In 像素風 Logo"
  >
    <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <g class="pixel-shadow" transform="translate(3 3)" aria-hidden="true">
        <rect
          v-for="(cell, index) in lensFramePixels"
          :key="`shadow-frame-${index}`"
          :x="cell[0] * pixelSize"
          :y="cell[1] * pixelSize"
          :width="pixelSize"
          :height="pixelSize"
        />
        <rect
          v-for="(cell, index) in handlePixels"
          :key="`shadow-handle-${index}`"
          :x="cell[0] * pixelSize"
          :y="cell[1] * pixelSize"
          :width="pixelSize"
          :height="pixelSize"
        />
      </g>

      <g class="pixel-lens">
        <rect
          v-for="(cell, index) in lensFillPixels"
          :key="`lens-fill-${index}`"
          class="pixel-lens-fill"
          :x="cell[0] * pixelSize"
          :y="cell[1] * pixelSize"
          :width="pixelSize"
          :height="pixelSize"
        />
      </g>

      <g class="animal-cycle" aria-hidden="true">
        <g
          :key="currentAnimal.name"
          class="animal"
          :class="currentAnimal.className"
        >
          <rect
            v-for="(cell, index) in currentAnimal.pixels"
            :key="`${currentAnimal.name}-pixel-${index}`"
            class="animal-pixel"
            :x="cell[0] * pixelSize"
            :y="cell[1] * pixelSize"
            :width="pixelSize"
            :height="pixelSize"
          />
          <rect
            v-for="(cell, index) in currentAnimal.cutouts"
            :key="`${currentAnimal.name}-cutout-${index}`"
            class="animal-cutout"
            :x="cell[0] * pixelSize"
            :y="cell[1] * pixelSize"
            :width="pixelSize"
            :height="pixelSize"
          />
        </g>
      </g>

      <g class="pixel-frame">
        <rect
          v-for="(cell, index) in lensFramePixels"
          :key="`lens-frame-${index}`"
          :x="cell[0] * pixelSize"
          :y="cell[1] * pixelSize"
          :width="pixelSize"
          :height="pixelSize"
        />
      </g>

      <g class="pixel-handle">
        <rect
          v-for="(cell, index) in handlePixels"
          :key="`handle-${index}`"
          :x="cell[0] * pixelSize"
          :y="cell[1] * pixelSize"
          :width="pixelSize"
          :height="pixelSize"
        />
      </g>

      <g class="pixel-spark" aria-hidden="true">
        <rect
          v-for="(cell, index) in sparklePixels"
          :key="`spark-${index}`"
          :x="cell[0] * pixelSize"
          :y="cell[1] * pixelSize"
          :width="pixelSize"
          :height="pixelSize"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.zoo-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--zoo-logo-color, var(--primary));
  flex-shrink: 0;
  image-rendering: pixelated;
}

.zoo-logo svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.pixel-shadow {
  fill: var(--zoo-logo-shadow, rgba(29, 36, 48, 0.22));
}

.pixel-lens-fill,
.animal-cutout {
  fill: var(--zoo-lens-fill, #f7fff0);
}

.pixel-frame,
.pixel-handle,
.animal-pixel,
.pixel-spark {
  fill: currentColor;
}

.animal {
  opacity: 1;
}

.pixel-spark {
  opacity: 0.8;
  animation: pixel-spark 1.5s steps(2, end) infinite;
}

@keyframes pixel-spark {
  0%, 46% { opacity: 0.85; }
  47%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .pixel-spark {
    animation: none;
  }
}
</style>
