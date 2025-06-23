<script setup lang="ts">
const { textarea, isConnected, error } = useCollab()
</script>

<template>
  <div class="flex flex-col h-[50vh] p-4">
    <div
      class="flex justify-between items-center px-4 py-2 bg-gray-100 rounded-t-lg border border-gray-300 border-b-0"
    >
      <div
        class="flex items-center gap-2 text-sm text-gray-600"
        :class="{ 'text-green-500': isConnected }"
      >
        <span
          class="w-2 h-2 rounded-full"
          :class="isConnected ? 'bg-green-500' : 'bg-red-500'"
        ></span>
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      </div>
      <div v-if="error" class="text-red-500 text-sm">
        {{ error }}
      </div>
    </div>

    <textarea
      v-model="textarea"
      class="flex-1 p-4 border border-gray-300 rounded-b-lg font-mono text-sm leading-6 resize-none outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
      placeholder="Start typing... Changes will sync in real-time"
      :disabled="!isConnected"
    />
  </div>
</template>
