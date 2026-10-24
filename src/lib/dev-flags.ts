export function isDevBypassEnabled(): boolean {
  return process.env.APP_DEV_BYPASS === "true" && process.env.NODE_ENV !== "production";
}
