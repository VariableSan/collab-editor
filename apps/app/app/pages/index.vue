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
  <div class="relative flex min-h-screen w-full flex-col gap-4">
    <header class="w-full py-4">
      <div class="container">
        <button
          class="cursor-pointer px-4 py-2 text-base leading-6 font-medium rounded-md text-white bg-primary hover:brightness-75 focus:ring ring-offset-2 ring-secondary focus:outline-none transition duration-150 ease-in-out"
          @click="() => toggleDark()"
        >
          Toggle theme
        </button>
      </div>
    </header>

    <main class="flex-1">
      <div class="container">
        <CollabEditor />
      </div>
    </main>
  </div>
</template>
