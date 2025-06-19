import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },

  modules: ['@nuxt/eslint', '@nuxt/test-utils', '@vueuse/nuxt'],

  css: ['~/assets/css/main.css'],

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2024-11-27',

  sourcemap: false,

  alias: {
    '@': fileURLToPath(new URL('./', import.meta.url)),
  },

  runtimeConfig: {
    public: {
      baseUrl: process.env.BASE_URL,
    },
  },

  nitro: {
    esbuild: {
      options: {
        target: 'esnext',
      },
    },
  },

  hooks: {
    close: nuxt => {
      if (!nuxt.options._prepare) {
        process.exit(0)
      }
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
