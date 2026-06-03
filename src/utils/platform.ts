export function isTossApp(): boolean {
  return navigator.userAgent.includes("TossApp");
}

export function isCapacitor(): boolean {
  return !!(window as unknown as Record<string, unknown>).Capacitor;
}

export function isLocalhost(): boolean {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}
