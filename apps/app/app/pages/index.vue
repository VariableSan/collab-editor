<script lang="ts" setup>
const isDark = useDark({
  selector: 'body',
  attribute: 'data-theme',
  valueDark: 'dark',
  valueLight: 'light',
  initialValue: 'dark',
})

const toggleDark = useToggle(isDark)
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 h-screen">
    <button @click="() => toggleDark()">toggle theme</button>

    <h1 class="font-bold text-2xl text-(--ui-primary)">Nuxt UI - Starter</h1>
  </div>
</template>
