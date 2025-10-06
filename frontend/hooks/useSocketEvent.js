import { useEffect } from "react"
import { socket } from "../lib/socketClient"

// Generic hook to subscribe to any Socket.IO event.
// Usage: useSocketEvent("message", (payload) => { ... }, [deps])
export function useSocketEvent(eventName, handler, deps = []) {
  useEffect(() => {
    if (!eventName || typeof handler !== "function") return

    const wrapped = (...args) => handler(...args)
    socket.on(eventName, wrapped)
    return () => socket.off(eventName, wrapped)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, ...deps])
}
