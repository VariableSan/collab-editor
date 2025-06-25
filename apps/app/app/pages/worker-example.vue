<script setup lang="ts">
import MyWorker from '~/assets/workers/worker-example?worker'

const numToSum = ref(1000000000)
const countingMsg = ref([])

const calculate = async (type: 'mainThread' | 'workerVite') => {
  let sum = 0
  const start = performance.now()

  switch (type) {
    case 'mainThread':
      sum = await sumNumMainMainThread()
      break
    case 'workerVite':
      sum = await sumNumWorkerVite()
      break
  }

  const end = performance.now()
  countingMsg.value.push(
    `The sum of 0 to ${numToSum.value} is  ${sum} (${type})  (time spent: ${end - start} ms)`,
  )
}

const sumNumMainMainThread = () => {
  return new Promise(resolve => {
    console.log('In main thread: calculating sum to ' + numToSum.value)
    let sum = 0
    for (let i = 1; i <= numToSum.value; i++) {
      sum += i
    }
    console.log(
      'In main thread: ' + 'The sum of 0 to ' + numToSum.value + ' is ' + sum,
    )
    resolve(sum)
  })
}

const sumNumWorkerVite = () => {
  return new Promise(resolve => {
    const worker = new MyWorker()
    worker.postMessage(numToSum.value)
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
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <div class="flex gap-2">
      <button
        class="border py-2 px-4 cursor-pointer"
        @click="() => calculate('mainThread')"
      >
        Sum 0 to {{ numToSum }} (Main thread)
      </button>

      <button
        class="border py-2 px-4 cursor-pointer"
        @click="() => calculate('workerVite')"
      >
        Sum 0 to {{ numToSum }} (Worker Vite)
      </button>
    </div>

    <div v-for="(val, index) in countingMsg" :key="index">{{ val }}</div>

    <div class="css_animated_part"></div>
  </div>
</template>

<style>
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
