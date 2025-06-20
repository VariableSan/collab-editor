<script lang="ts" setup>
import { simpleDiff } from 'diff-lib'

const isDark = useDark({
  selector: 'body',
  attribute: 'data-theme',
  valueDark: 'dark',
  valueLight: 'light',
  initialValue: 'dark',
})

const toggleDark = useToggle(isDark)

const oldText = ref('')
const newText = ref('')

const getDiff = computed(() => simpleDiff(oldText.value, newText.value))
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 h-screen">
    <button @click="() => toggleDark()">toggle theme</button>

    <h1 class="font-bold text-2xl text-(--ui-primary)">Nuxt UI - Starter</h1>

    <div class="flex flex-col gap-2">
      <input v-model="oldText" class="border" type="text" />
      <input v-model="newText" class="border" type="text" />

      <div>
        <h1>Result: {{ getDiff }}</h1>
      </div>
    </div>
  </div>
</template>
