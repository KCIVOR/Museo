import { io } from "socket.io-client"

// Compute the Socket.IO base URL. Prefer VITE_SOCKET_BASE; else derive from VITE_API_BASE by stripping trailing "/api".
const rawApi = import.meta.env.VITE_API_BASE || "http://localhost:3000"
const derived = typeof rawApi === "string" ? rawApi.replace(/\/?api\/?$/, "") : "http://localhost:3000"
const SOCKET_BASE = import.meta.env.VITE_SOCKET_BASE || derived

export const socket = io(SOCKET_BASE, {
  withCredentials: true
})

// Debug connection lifecycle
socket.on("connect", () => {
  console.log("[socket-client] connected:", socket.id)
})
socket.on("disconnect", (reason) => {
  console.log("[socket-client] disconnected:", reason)
})
socket.on("connect_error", (err) => {
  console.error("[socket-client] connect_error:", err?.message || err, "base:", SOCKET_BASE)
})