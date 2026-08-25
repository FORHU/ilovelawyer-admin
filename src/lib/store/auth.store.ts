import { create } from "zustand"

export interface AdminAuthUser {
  id: string
  username: string
  email: string
  name: string | null
  role: "USER" | "ADMIN"
}

interface AuthState {
  accessToken: string | null
  user: AdminAuthUser | null
  setAuth: (params: { accessToken: string; user: AdminAuthUser }) => void
  setAccessToken: (accessToken: string) => void
  clearAuth: () => void
}

// Access token held in memory only — never localStorage/sessionStorage — mirroring
// ilovelawyer-app's auth store convention.
export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,
  setAuth: ({ accessToken, user }) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ accessToken: null, user: null }),
}))
