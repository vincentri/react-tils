// Stands in for a server in the useEventSource demo, which is a static site: answers
// ./demo-events with a real text/event-stream that sends a tick every second. Everything else
// goes to the network untouched.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (event) => {
  if (new URL(event.request.url).pathname.endsWith('/demo-events')) {
    const encoder = new TextEncoder()
    let timer
    const body = new ReadableStream({
      start(controller) {
        let count = 0
        const send = () => {
          count += 1
          const data = JSON.stringify({ count, time: new Date().toLocaleTimeString('en-GB') })
          try {
            controller.enqueue(encoder.encode(`event: tick\ndata: ${data}\n\n`))
          } catch {
            clearInterval(timer) // the page closed the stream (Firefox skips cancel)
          }
        }
        send()
        timer = setInterval(send, 1000)
      },
      cancel() {
        clearInterval(timer)
      },
    })
    event.respondWith(new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }))
  }
})
