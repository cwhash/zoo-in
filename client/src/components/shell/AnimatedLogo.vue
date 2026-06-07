<script setup>
/**
 * Zoo-In 像素風動態 Logo：放大鏡 + 動物剪影輪播
 * 動物序列：猴子 -> ET -> 蝴蝶 -> 鯨魚 -> 貓 -> 鳥
 * 以 16x16 方格繪製，使用 steps() 硬切換，避免柔化與抗鋸齒感。
 */
defineProps({
  size: { type: Number, default: 40 },
})

const pixelSize = 6

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
    label: '猴子',
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
    label: 'ET',
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
    label: '蝴蝶',
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
    label: '鯨魚',
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
    label: '貓',
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
    label: '鳥',
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
</script>

<template>
  <div
    class="zoo-logo"
    :style="{ width: size + 'px', height: size + 'px' }"
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
          v-for="animal in animals"
          :key="animal.name"
          class="animal"
          :class="animal.className"
        >
          <rect
            v-for="(cell, index) in animal.pixels"
            :key="`${animal.name}-pixel-${index}`"
            class="animal-pixel"
            :x="cell[0] * pixelSize"
            :y="cell[1] * pixelSize"
            :width="pixelSize"
            :height="pixelSize"
          />
          <rect
            v-for="(cell, index) in animal.cutouts"
            :key="`${animal.name}-cutout-${index}`"
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
  opacity: 0;
  animation: pixel-animal-cycle 3s steps(1, end) infinite;
}

.animal-1 { animation-delay: 0s; }
.animal-2 { animation-delay: 0.5s; }
.animal-3 { animation-delay: 1s; }
.animal-4 { animation-delay: 1.5s; }
.animal-5 { animation-delay: 2s; }
.animal-6 { animation-delay: 2.5s; }

.pixel-spark {
  opacity: 0.8;
  animation: pixel-spark 1.5s steps(2, end) infinite;
}

@keyframes pixel-animal-cycle {
  0%, 15% { opacity: 1; }
  16%, 100% { opacity: 0; }
}

@keyframes pixel-spark {
  0%, 46% { opacity: 0.85; }
  47%, 100% { opacity: 0; }
}
</style>
