// Auth paths that read/set the refreshToken httpOnly cookie — proxied same-origin
// via next.config.ts's rewrites() so the cookie (SameSite=Lax, scoped to the API's
// own host) actually reaches the browser as first-party. Mirrors ilovelawyer-app's
// lib/api-version.ts / lib/fetch.ts split for the same reason.
export const AUTH_PATHS = ["/api/auth/login", "/api/auth/refresh", "/api/auth/logout"] as const
