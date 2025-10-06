import { useEffect } from "react"
import { socket } from "./notificationsSocket"

export function useRealtimeNotifications(onNotify) {
  useEffect(() => {
    const handler = (payload) => onNotify?.(payload)
    socket.on("notification", handler)
    return () => socket.off("notification", handler)
  }, [onNotify])
}