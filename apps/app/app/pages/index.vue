<script lang="ts" setup>
import DiffWorker from '~/assets/workers/diff-worker?worker'

const isDark = useDark({
  selector: 'body',
  attribute: 'data-theme',
  valueDark: 'dark',
  valueLight: 'light',
  initialValue: 'dark',
})

const a = ref('')
const b = ref('')
const diffResult = ref()

const toggleDark = useToggle(isDark)

const sumDiffWorker = (a: string, b: string) => {
  return new Promise(resolve => {
    const worker = new DiffWorker()
    worker.postMessage({
      type: 'calculate-diff',
      oldText: a,
      newText: b,
    })
    worker.addEventListener(
      'message',
      e => {
        if (e.data) {
          resolve(e.data)
          worker.terminate()
        }
      },
      false,
    )
  })
}

const sumDiffWorkerDebounced = useDebounceFn(sumDiffWorker, 1000)

watch(
  () => [a.value, b.value],
  async ([a, b]) => {
    if (a && b) {
      diffResult.value = await sumDiffWorkerDebounced(a, b)
    }
  },
)
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 h-screen">
    <button @click="() => toggleDark()">toggle theme</button>

    <h1 class="font-bold text-2xl text-(--ui-primary)">Nuxt UI - Starter</h1>

    <div class="flex flex-col gap-2 border p-2">
      <input v-model="a" type="text" class="border p-1" />
      <input v-model="b" type="text" class="border p-1" />

      <h2>Result: {{ diffResult }}</h2>
    </div>

    <div class="css_animated_part"></div>
  </div>
</template>

<style scoped>
.css_animated_part {
  width: 100px;
  height: 100px;
  position: relative;
  background-color: red;
  animation-name: example;
  animation-duration: 4s;
  animation-iteration-count: infinite;
}

@keyframes example {
  0% {
    background-color: red;
    left: 0px;
    top: 0px;
  }

  25% {
    background-color: yellow;
    left: 200px;
    top: 0px;
  }

  50% {
    background-color: blue;
    left: 200px;
    top: 200px;
  }

  75% {
    background-color: green;
    left: 0px;
    top: 200px;
  }

  100% {
    background-color: red;
    left: 0px;
    top: 0px;
  }
}
</style>
