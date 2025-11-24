// backend/utils/ioBus.js
// Simple IO holder to allow services/controllers to emit Socket.IO events without circular imports

let ioInstance = null;

export function setIO(io) {
  ioInstance = io;
}

export function getIO() {
  return ioInstance;
}

export default { setIO, getIO };
