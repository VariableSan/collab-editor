const countSum = (n: number) => {
  let sum = 0
  for (let i = 1; i <= n; i++) {
    sum += i
  }
  return sum
}

self.addEventListener(
  'message',
  e => {
    console.log('In worker (vite): received data: ' + e.data)
    const sum = countSum(e.data)
    const message = 'In worker (vite): The sum of 1 to ' + e.data + ' is ' + sum
    console.log(message)
    self.postMessage(sum)
  },
  false,
)
