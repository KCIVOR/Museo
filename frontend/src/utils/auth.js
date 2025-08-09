
export function decodeJWT(token) {
  try {
    const payload = token.split('.')[1]; // middle part of JWT
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/')); 
    return JSON.parse(decoded); // convert to object
  } catch (e) {
    console.error("Invalid token", e);
    return null;
  }
}