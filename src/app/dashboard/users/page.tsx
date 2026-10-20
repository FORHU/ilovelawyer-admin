import { redirect } from "next/navigation"

// The users list is split into Lawyers and Clients; keep old /dashboard/users links working.
export default function UsersRedirect() {
  redirect("/dashboard/lawyers")
}
