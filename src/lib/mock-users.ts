// Mirrors ilovelawyer-api's Prisma `User` model (see ilovelawyer-api/prisma/schema.prisma)
// so this table's shape doesn't need reworking once it's wired to a real endpoint.
export type UserRole = "USER" | "ADMIN"

export interface AdminUser {
  id: string
  name: string | null
  username: string
  email: string
  role: UserRole
  provider: "google" | null
  isEmailVerified: boolean
  createdAt: string
  lastLoginAt: string | null
}

export const mockUsers: AdminUser[] = [
  {
    id: "8f14e45f-ceea-467e-b7ea-01f1b4e0e1a2",
    name: "Maria Santos",
    username: "maria.santos.4k2",
    email: "maria.santos@example.com",
    role: "ADMIN",
    provider: null,
    isEmailVerified: true,
    createdAt: "2026-06-24T09:12:00.000Z",
    lastLoginAt: "2026-08-23T14:03:00.000Z",
  },
  {
    id: "c81e728d-9d4c-2f63-af06-7f89cc14862c",
    name: "Juan Cruz",
    username: "juan.cruz.7x9",
    email: "juan.cruz@example.com",
    role: "USER",
    provider: "google",
    isEmailVerified: true,
    createdAt: "2026-06-30T11:40:00.000Z",
    lastLoginAt: "2026-08-24T02:11:00.000Z",
  },
  {
    id: "eccbc87e-4b5c-e3eb-bdf5-3372f96e14b1",
    name: "Angela Reyes",
    username: "angela.reyes.2m8",
    email: "angela.reyes@example.com",
    role: "USER",
    provider: null,
    isEmailVerified: false,
    createdAt: "2026-07-02T08:05:00.000Z",
    lastLoginAt: null,
  },
  {
    id: "a87ff679-a2f3-e71d-9181-a67b7542122c",
    name: "Liam O'Connor",
    username: "liam.oconnor.9q1",
    email: "liam.oconnor@example.com",
    role: "USER",
    provider: "google",
    isEmailVerified: true,
    createdAt: "2026-07-10T16:22:00.000Z",
    lastLoginAt: "2026-08-20T19:47:00.000Z",
  },
  {
    id: "e4da3b7f-bbce-2345-d777-2b0674a318d5",
    name: "Sofia Bautista",
    username: "sofia.bautista.5r3",
    email: "sofia.bautista@example.com",
    role: "USER",
    provider: null,
    isEmailVerified: true,
    createdAt: "2026-07-15T10:00:00.000Z",
    lastLoginAt: "2026-08-22T07:30:00.000Z",
  },
  {
    id: "1679091c-5a88-0faf-8467-0e527b78fe58",
    name: null,
    username: "kevin.tan.1a0",
    email: "kevin.tan@example.com",
    role: "USER",
    provider: "google",
    isEmailVerified: true,
    createdAt: "2026-07-19T13:51:00.000Z",
    lastLoginAt: "2026-08-10T05:16:00.000Z",
  },
  {
    id: "8f14e45f-ceea-467e-b7ea-01f1b4e0e1b3",
    name: "Grace Villanueva",
    username: "grace.villanueva.3n6",
    email: "grace.villanueva@example.com",
    role: "ADMIN",
    provider: null,
    isEmailVerified: true,
    createdAt: "2026-07-22T09:00:00.000Z",
    lastLoginAt: "2026-08-24T01:05:00.000Z",
  },
  {
    id: "c9f0f895-fb98-ab91-9159-af1e60cc4104",
    name: "Marcus Lee",
    username: "marcus.lee.6t2",
    email: "marcus.lee@example.com",
    role: "USER",
    provider: null,
    isEmailVerified: false,
    createdAt: "2026-08-01T12:18:00.000Z",
    lastLoginAt: null,
  },
  {
    id: "45c48cce-2e2d-7fbd-ea1a-fef1c33e4b23",
    name: "Isabel Fernandez",
    username: "isabel.fernandez.8p4",
    email: "isabel.fernandez@example.com",
    role: "USER",
    provider: "google",
    isEmailVerified: true,
    createdAt: "2026-08-05T15:33:00.000Z",
    lastLoginAt: "2026-08-23T22:40:00.000Z",
  },
  {
    id: "d3d94468-4022-59fd-8b1e-1cbbb17b7d33",
    name: "Noah Garcia",
    username: "noah.garcia.0z7",
    email: "noah.garcia@example.com",
    role: "USER",
    provider: null,
    isEmailVerified: true,
    createdAt: "2026-08-12T18:47:00.000Z",
    lastLoginAt: "2026-08-24T06:52:00.000Z",
  },
]
